import { useRef } from 'react';
import { Animated, PanResponder, View } from 'react-native';

// Pinch to zoom (1×–3×) toward the pinch focal point, drag to pan while
// zoomed, double-tap to zoom toward the tapped spot. Single taps fall
// through to children (tokens and tiles stay tappable).
export function ZoomableBoard({ size, children }: { size: number; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx    = useRef(new Animated.Value(0)).current;
  const ty    = useRef(new Animated.Value(0)).current;

  const containerRef = useRef<View>(null);
  const originRef    = useRef({ x: 0, y: 0 });

  const st = useRef({
    scale: 1, tx: 0, ty: 0,
    startScale: 1, startTx: 0, startTy: 0, startDist: 0,
    startFocal: null as null | { x: number; y: number },
    lastTap: 0, gestureEndAt: 0, gesturing: false,
  });

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const maxT  = (sc: number) => ((sc - 1) * size) / 2;

  function measure(cb: () => void) {
    containerRef.current?.measureInWindow((x, y) => {
      originRef.current = { x: x ?? 0, y: y ?? 0 };
      cb();
    });
  }

  function applyTranslate(x: number, y: number, sc: number) {
    const m = maxT(sc);
    st.current.tx = clamp(x, -m, m);
    st.current.ty = clamp(y, -m, m);
    tx.setValue(st.current.tx);
    ty.setValue(st.current.ty);
  }

  function resetZoom() {
    st.current.scale = 1; st.current.tx = 0; st.current.ty = 0;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 7 }),
      Animated.spring(tx,    { toValue: 0, useNativeDriver: true, friction: 7 }),
      Animated.spring(ty,    { toValue: 0, useNativeDriver: true, friction: 7 }),
    ]).start();
  }

  // Zoom so the board point currently under `focal` (coords relative to the
  // container center) stays under it at the new scale.
  function zoomTowards(focal: { x: number; y: number }, newScale: number, animated: boolean) {
    const s0 = st.current.scale;
    const m  = maxT(newScale);
    const nx = clamp(focal.x - (focal.x - st.current.tx) * (newScale / s0), -m, m);
    const ny = clamp(focal.y - (focal.y - st.current.ty) * (newScale / s0), -m, m);
    st.current.scale = newScale; st.current.tx = nx; st.current.ty = ny;
    if (animated) {
      Animated.parallel([
        Animated.spring(scale, { toValue: newScale, useNativeDriver: true, friction: 7 }),
        Animated.spring(tx,    { toValue: nx,       useNativeDriver: true, friction: 7 }),
        Animated.spring(ty,    { toValue: ny,       useNativeDriver: true, friction: 7 }),
      ]).start();
    } else {
      scale.setValue(newScale); tx.setValue(nx); ty.setValue(ny);
    }
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, g) =>
      g.numberActiveTouches === 2 ||
      (st.current.scale > 1.02 && Math.abs(g.dx) + Math.abs(g.dy) > 10),
    onPanResponderGrant: () => {
      st.current.gesturing = true;
      st.current.startScale = st.current.scale;
      st.current.startTx = st.current.tx;
      st.current.startTy = st.current.ty;
      st.current.startDist = 0;
      st.current.startFocal = null;
      measure(() => {});
    },
    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        const dist = Math.hypot(dx, dy);
        const focal = {
          x: (touches[0].pageX + touches[1].pageX) / 2 - originRef.current.x - size / 2,
          y: (touches[0].pageY + touches[1].pageY) / 2 - originRef.current.y - size / 2,
        };
        if (!st.current.startDist) {
          st.current.startDist = dist;
          st.current.startFocal = focal;
          return;
        }
        const ns = clamp(st.current.startScale * (dist / st.current.startDist), 1, 3);
        const f0 = st.current.startFocal ?? focal;
        // pin the board point that started under the pinch to the current focal
        const m  = maxT(ns);
        const nx = clamp(focal.x - (f0.x - st.current.startTx) * (ns / st.current.startScale), -m, m);
        const ny = clamp(focal.y - (f0.y - st.current.startTy) * (ns / st.current.startScale), -m, m);
        st.current.scale = ns;
        scale.setValue(ns);
        applyTranslate(nx, ny, ns);
      } else {
        applyTranslate(st.current.startTx + g.dx, st.current.startTy + g.dy, st.current.scale);
      }
    },
    onPanResponderRelease: () => {
      st.current.gesturing = false;
      st.current.gestureEndAt = Date.now();
      if (st.current.scale < 1.05) resetZoom();
    },
    onPanResponderTerminate: () => {
      st.current.gesturing = false;
      st.current.gestureEndAt = Date.now();
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  function handleTouchEnd(e: any) {
    const { pageX, pageY } = e.nativeEvent;
    const now = Date.now();
    // ignore touch-ends that belong to a pinch/pan gesture
    if (st.current.gesturing || now - st.current.gestureEndAt < 200) return;
    if (now - st.current.lastTap < 280) {
      st.current.lastTap = 0;
      if (st.current.scale > 1.2) {
        resetZoom();
      } else {
        measure(() => {
          zoomTowards({
            x: pageX - originRef.current.x - size / 2,
            y: pageY - originRef.current.y - size / 2,
          }, 2.1, true);
        });
      }
    } else {
      st.current.lastTap = now;
    }
  }

  return (
    <View
      ref={containerRef}
      style={{ width: size, height: size, overflow: 'hidden', borderRadius: 14 }}
      {...pan.panHandlers}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View style={{ width: size, height: size, transform: [{ translateX: tx }, { translateY: ty }, { scale }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
