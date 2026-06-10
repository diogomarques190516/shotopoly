# Shotopoly 🥃🎲

Monopoly-style multiplayer drinking game. Properties and rents can be paid in
money **or shots**, every game ends automatically after a fixed number of
rounds (Fast ~20 min · Classic ~35 min · Marathon ~50 min), and the biggest
fortune wins.

Built with Expo (React Native) + Supabase Realtime. Runs on Android and iOS.

## 1. Supabase setup (required once)

Multiplayer does not work until this is done — realtime events only fire for
tables registered in the publication, and all atomic game operations live in
SQL functions.

1. Create a project at [supabase.com](https://supabase.com) (or open the existing one).
2. Open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql), press **Run**.
   The file is idempotent — safe to run again on an existing project.
3. Copy the project URL and anon key from **Settings → API**.

## 2. Local configuration

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## 3. Run in development

```bash
npm install --legacy-peer-deps
npx expo start
```

Scan the QR code with Expo Go (Android/iOS) on every phone that will play.

## 4. Build for the stores (EAS)

```bash
npm install -g eas-cli
eas login                       # your Expo account
eas build:configure             # links the project (first time only)

# Secrets must also exist in EAS for production builds:
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://<project>.supabase.co" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon-key>" --environment production

# Android — .aab for the Play Store:
eas build --platform android --profile production

# Installable .apk to test on real phones first:
eas build --platform android --profile preview
```

Upload the generated `.aab` in [Google Play Console](https://play.google.com/console)
(create the app, then Production → Create release). After the first manual
upload you can automate with `eas submit --platform android`.

For iOS: `eas build --platform ios --profile production` followed by
`eas submit --platform ios` (requires an Apple Developer account).

## Game design notes

- **Game length is guaranteed by a turn budget**, not by bankruptcies:
  `total turns = target minutes × 60 / 35 s per turn`, rounded to a multiple
  of the player count (see `calcMaxTurns` in
  [`constants/gameConstants.ts`](constants/gameConstants.ts)). When the budget
  runs out the game ends for everyone and the biggest fortune
  (cash + property value + upgrades) wins.
- **All money/shot mutations are atomic** (Postgres RPCs in
  `supabase/schema.sql`, called via [`lib/db.ts`](lib/db.ts)), so simultaneous
  actions can't lose updates. Turn advancement is guarded by an
  expected-turn check so double "skip" taps can't skip two players.
- Sounds are tiny WAVs generated at runtime (`lib/sounds.ts`) — no audio
  assets to bundle.
