# live-cursors

real-time collaborative cursor & drawing playground. see where others are pointing, draw together, talk in shared rooms.

## features
- live cursor tracking across users
- collaborative drawing
- room-based isolation
- color-coded cursors & names
- voice chat over webrtc
- live speech-to-text transcripts

## setup
```bash
npm install
npm start
```

runs on `http://localhost:3000`. visit `/room/your-room-name` to create or join a room.

## deploy (render)

works on any host that supports persistent websockets (render, railway, fly.io). render is the easiest:

1. push this repo to github (see below)
2. on [render.com](https://render.com) → **new +** → **web service** → connect your repo
3. settings:
   - **environment:** node
   - **build command:** `npm install`
   - **start command:** `npm start`
4. hit **create web service**. render assigns `PORT` automatically & gives you an `https://...onrender.com` url
5. share the url. anyone can visit `/room/anything` to join

## push to github

first time only:
```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/live-cursors.git
git push -u origin main
```

after that:
```bash
git add .
git commit -m "your message"
git push
```

## tech
websockets, webrtc & vanilla js. no frameworks, no nonsense.

uses google & cloudflare stun servers plus open relay turn (metered) so peers can connect across nats & firewalls.
