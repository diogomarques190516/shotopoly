import { useRef } from 'react';
import { Animated, PanResponder, View } from 'react-native';

// Pinch to zoom (1×–3×), drag to pan while zoomed, double-tap to toggle zoom.
// Single taps fall through to children (tokens stay tappable).
export function ZoomableBoard({ size, children }: { size: number; children: React.ReactNode }) {
  const scale = useRef(new Animated.Value(1)).current;
  const tx    = useRef(new Animated.Value(0)).current;
  const ty    = useRef(new Animated.Value(0)).current;

  const st = useRef({
    scale: 1, tx: 0, ty: 0,
    startScale: 1, startTx: 0, startTy: 0, startDist: 0,
    lastTap: 0,
  });

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const maxT  = (sc: number) => ((sc - 1) * size) / 2;

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

  function zoomIn() {
    st.current.scale = 1.9;
    applyTranslate(st.current.tx, st.current.ty, 1.9);
    Animated.spring(scale, { toValue: 1.9, useNativeDriver: true, friction: 7 }).start();
  }

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (e, g) =>
      g.numberActiveTouches === 2 ||
      (st.current.scale > 1.02 && Math.abs(g.dx) + Math.abs(g.dy) > 10),
    onPanResponderGrant: () => {
      st.current.startScale = st.current.scale;
      st.current.startTx = st.current.tx;
      st.current.startTy = st.current.ty;
      st.current.startDist = 0;
    },
    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        const dx = touches[0].pageX - touches[1].pageX;
        const dy = touches[0].pageY - touches[1].pageY;
        const dist = Math.hypot(dx, dy);
        if (!st.current.startDist) { st.current.startDist = dist; return; }
        const ns = clamp(st.current.startScale * (dist / st.current.startDist), 1, 3);
        st.current.scale = ns;
        scale.setValue(ns);
        applyTranslate(st.current.tx, st.current.ty, ns);
      } else {
        applyTranslate(st.current.startTx + g.dx, st.current.startTy + g.dy, st.current.scale);
      }
    },
    onPanResponderRelease: () => {
      if (st.current.scale < 1.05) resetZoom();
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  function handleTouchEnd() {
    const now = Date.now();
    if (now - st.current.lastTap < 280) {
      st.current.lastTap = 0;
      if (st.current.scale > 1.2) resetZoom();
      else zoomIn();
    } else {
      st.current.lastTap = now;
    }
  }

  return (
    <View
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
