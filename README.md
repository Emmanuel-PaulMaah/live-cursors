# live-cursors

real-time collaborative cursor & drawing playground. see where others are pointing, draw together, talk in shared rooms.

## features
- live cursor tracking across users
- collaborative drawing on a shared canvas
- room-based isolation (lobby first, then `/room/<name>`)
- color-coded cursors & names, persisted per browser
- two-way voice chat over webrtc (stun + turn fallback)
- live speech-to-text subtitles
- independent toggles for mic, speaker & subtitles
- light & dark themes
- mobile responsive with collapsible controls

## setup
```bash
npm install
npm start
```

runs on `http://localhost:3000`. you'll land on the lobby — pick a name & room, then you'll be sent to `/room/<name>`. share that url to invite anyone.

## tech
websockets, webrtc & vanilla js. no frameworks, no nonsense. lucide icons inlined as svg.

uses google & cloudflare stun servers plus open relay turn (metered) so peers can connect across nats & firewalls.
