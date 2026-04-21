# 📡 WebSockets & Real-Time Communication — Interview Notes

---

## 1. Polling

**Definition:** Client repeatedly sends HTTP requests at intervals to check for new data.

**Types:**
- **Short Polling** — requests at fixed intervals
- **Long Polling** — server holds the request open until data is available, then responds

**Drawbacks:** Wastes bandwidth, high latency, not truly real-time.

> Analogy: "Are we there yet?" asked repeatedly vs. a live phone call.

---

## 2. Protocol

A **protocol** is a set of rules defining how data is sent, received, and interpreted between devices. Without protocols, devices cannot communicate.

**Common protocols:** HTTP, HTTPS, FTP, TCP/IP, WebSocket, QUIC

---

## 3. Why HTTP is Not Suitable for Real-Time

HTTP follows a **request → response** model — the connection closes after each response. The server **cannot push data** proactively.

**Problems:** High latency, repeated requests, wasted bandwidth, no server-push.

---

## 4. WebSockets

**Definition:** A protocol providing a **persistent, full-duplex, bidirectional** connection over a single TCP connection.

### Handshake (HTTP Upgrade)
```
Client → GET /chat HTTP/1.1
         Upgrade: websocket
         Connection: Upgrade

Server → HTTP/1.1 101 Switching Protocols
```
After the handshake, HTTP is dropped and the WebSocket protocol takes over.

### Full-Duplex vs Half-Duplex
| | Half Duplex | Full Duplex |
|---|---|---|
| Communication | One direction at a time | Both directions simultaneously |
| Example | Walkie-talkie | Phone call |

### WebSocket Lifecycle (4 States)
| State | Code | Description |
|---|---|---|
| CONNECTING | 0 | HTTP upgrade in progress |
| OPEN | 1 | Active, full-duplex communication |
| CLOSING | 2 | Close handshake in progress |
| CLOSED | 3 | Connection fully terminated |

### Client-Side Events
```javascript
const socket = new WebSocket("wss://example.com");
socket.onopen    = () => socket.send("Hello");
socket.onmessage = (e) => console.log(e.data);
socket.onerror   = (e) => console.error(e);
socket.onclose   = () => console.log("Disconnected");
```

### Server-Side (ws library)
```javascript
wss.on("connection", (ws) => {
  ws.on("message", (data) => { /* handle */ });
  ws.on("error",   (err)  => { /* handle */ });
  ws.on("close",   ()     => { /* handle */ });
});
```

---

## 5. ws vs wss
| | ws | wss |
|---|---|---|
| Encryption | None | TLS/SSL |
| Port | 80 | 443 |
| Use | Local/testing | Production |

> Rule: If your site uses HTTPS, you **must** use `wss`. Browsers block mixed secure/non-secure.

---

## 6. Why WebSockets Are Cheaper Than Polling

- No repeated HTTP headers per message
- No TCP reconnect overhead
- Data only transmitted when needed
- Lower CPU and bandwidth usage at scale

---

## 7. Stateful vs Stateless

| | WebSocket (Stateful) | HTTP (Stateless) |
|---|---|---|
| Connection | Persistent | Temporary |
| Server memory | Maintains state | No memory |
| Communication | Continuous | Request-response |

---

## 8. Ghost Connections

**Definition:** A connection the server considers active but is actually dead on the client side (network dropped, browser crashed, etc.)

**Problems:** Memory leaks, wasted resources, wrong active-user count.

**Solution: Heartbeat (Ping/Pong)**
```javascript
// ws library heartbeat
wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
```

**Production settings:** Ping every 20–30s, timeout 10–15s after ping.

```javascript
// Socket.IO config
const io = require("socket.io")(server, {
  pingInterval: 25000,
  pingTimeout: 10000,
});
```

---

## 9. Ping/Pong vs Polling

| | Polling | Ping/Pong |
|---|---|---|
| Purpose | Fetch new data | Check if connection is alive |
| Protocol | HTTP | WebSocket |
| Data transferred | Yes | No (health check only) |

> Ping/Pong is a **heartbeat**, not data fetching.

---

## 10. JSON vs Binary in WebSockets

| | JSON | Binary |
|---|---|---|
| Readability | High | None |
| Size | Larger | Smaller |
| Speed | Slower | Faster |
| Use cases | Chat, APIs | Media, gaming, trading |

> Start with JSON. Switch to binary (ArrayBuffer, Blob) when performance becomes a bottleneck.

---

## 11. Opcodes (WebSocket Frame Types)

| Opcode | Meaning |
|---|---|
| 0x1 | Text frame (UTF-8) |
| 0x2 | Binary frame |
| 0x8 | Connection close |
| 0x9 | Ping |
| 0xA | Pong |

Each WebSocket frame carries an opcode so the receiver knows how to handle it.

---

## 12. Backpressure

**Definition:** Occurs when the sender is faster than the receiver, causing data to pile up in buffers.

**Solutions:**
- **Flow control** — pause/resume sending
- **Buffer monitoring** — check `ws.bufferedAmount` before sending
- **Rate limiting** — cap messages per second
- **Message dropping** — discard stale data (e.g. live stock ticks)
- **Compression** — reduce payload size

```javascript
if (ws.bufferedAmount < MAX_BUFFER) {
  ws.send(data);
}
```

---

## 13. Message Envelope Pattern

Wrapping messages in a structured format enables clean routing and extensibility.

```json
{
  "type": "chat.message",
  "payload": { "text": "Hello" },
  "meta": { "userId": "123", "timestamp": 1234567890 }
}
```

**Why:** Easy routing by `type`, clean debugging, supports metadata, scales well.

**Types:**
- **Type-based** — `"type": "chat.message"` ✅ most common
- **Command-based** — `"action": "sendMessage"` — API-like
- **Topic-based** — `"topic": "room-1"` — Pub/Sub systems

---

## 14. Message Routing

| Type | Pattern | Example |
|---|---|---|
| **Unicast** | 1 → 1 | Private DM |
| **Broadcast** | 1 → All | System announcement |
| **Multicast** | 1 → Group | Group chat / room |

```javascript
// Unicast
clients[userId].send(message);

// Broadcast (ws)
wss.clients.forEach(client => client.send(message));

// Multicast (Socket.IO rooms)
io.to("room1").emit("event", data);
```

---

## 15. Common Socket Patterns

| Pattern | Description | Use Case |
|---|---|---|
| Request–Response | Client asks, server answers | API-like calls |
| Pub/Sub | Subscribe to topics, receive broadcasts | Chat, notifications |
| Broadcast | Send to all clients | Announcements, dashboards |
| Rooms/Channels | Send to a named group | Group chat, games |
| Event-Driven | Emit named events | Flexible real-time systems |
| Streaming | Continuous data flow | Stock prices, video |
| ACK | Confirm delivery | Payments, critical data |

---

## 16. Acknowledgement & Reliability

WebSockets do **not** guarantee delivery. You must build it yourself.

**ACK Flow:**
```
Client → { id: "123", type: "chat.message", payload: {...} }
Server → { type: "ack", id: "123" }
```

**Reliability Levels:**
- **At Most Once** — send once, no retry (typing indicators)
- **At Least Once** — retry until ACK, may duplicate (chat messages)
- **Exactly Once** — no loss + no duplicates, needs deduplication (payments)

**Socket.IO built-in ACK:**
```javascript
socket.emit("message", data, (response) => {
  console.log("ACK received:", response);
});
```

---

## 17. Publish / Subscribe (Pub/Sub)

**Components:** Publisher → Broker (server) → Subscribers

Publisher does **not** know who receives the message — decoupled by design.

```javascript
// ws — manual Pub/Sub
const rooms = {};
function subscribe(ws, room) {
  (rooms[room] = rooms[room] || []).push(ws);
}
function publish(room, message) {
  rooms[room]?.forEach(client => client.send(message));
}

// Socket.IO — built-in rooms
socket.join("room1");
io.to("room1").emit("message", data);
```

---

## 18. Message Broker

A system that receives, stores, and routes messages between producers and consumers.

**Why needed:** Decoupling, scalability, reliability, load handling during spikes.

| Broker | Best For |
|---|---|
| Redis | Real-time, low-latency systems |
| Kafka | High-throughput, big data pipelines |
| RabbitMQ | Reliable task queues |
| AWS SQS | Cloud-native queues |

> Analogy: Message broker = Post Office — you send a letter, it handles delivery.

---

## 19. Socket.IO vs ws vs Pusher vs Ably

| | ws | Socket.IO | Pusher | Ably |
|---|---|---|---|---|
| Type | Low-level library | Feature-rich wrapper | Managed service | Managed platform |
| Control | Full | Moderate | Low | Low |
| Built-ins | None | Rooms, reconnect, ACK | Hosted | Hosted + guaranteed delivery |
| Scale | DIY | DIY | Medium | Enterprise |
| Cost | Free | Free | Paid (free tier) | Paid (free tier) |

**Decision guide:**
- Learning / full control / performance → **ws**
- Projects / interviews / apps → **Socket.IO** ✅
- No backend needed → **Pusher**
- Enterprise scale + reliability → **Ably**

---

## 20. When to Use WebSockets

**Use WebSockets when:**
- Real-time updates (chat, notifications, live dashboards)
- Continuous data streams (tracking, IoT, gaming)
- Low latency required (trading, multiplayer)
- Bidirectional communication needed

**Use HTTP instead when:**
- Simple CRUD APIs
- Data changes rarely
- One-time request-response (login, profile fetch)
- SEO-critical pages

**Best practice:** Use both — HTTP for initial data loads and auth, WebSockets for live updates.

---

## 21. Server-Sent Events (SSE)

**Definition:** HTTP-based, **one-way** server → client streaming. No protocol upgrade needed.

```javascript
const es = new EventSource("/events");
es.onmessage = (e) => console.log(e.data);
```

**Use SSE when:** Notifications, live feeds, AI token streaming (ChatGPT-style), dashboards.

**Do NOT use SSE when:** You need two-way communication, binary data, or very high frequency.

| | SSE | WebSocket |
|---|---|---|
| Direction | Server → Client only | Bidirectional |
| Protocol | HTTP | WebSocket |
| Complexity | Simple | Moderate |
| Auto-reconnect | Built-in | Must implement |

---

## 22. WebRTC

**Definition:** Peer-to-peer real-time communication directly between browsers — no server relay for media.

**Supports:** Video, audio, file sharing, data channels.

**Components:**
- **Signaling** (via WebSocket/HTTP) — exchange SDP and ICE candidates to initiate
- **ICE** — finds best network path between peers
- **STUN** — discovers your public IP
- **TURN** — relay server when direct P2P fails

**Flow:**
```
1. Both users connect to signaling server
2. Exchange SDP offer/answer + ICE candidates
3. Direct P2P connection established
4. Media/data flows peer-to-peer
```

> WebSockets are used for the **signaling phase only**. Actual media goes P2P.

| | WebSocket | WebRTC |
|---|---|---|
| Connection | Client ↔ Server | Peer ↔ Peer |
| Latency | Low | Very low |
| Media support | No | Yes (audio/video) |
| Server load | High | Low (P2P) |

---

## 23. WebTransport

**Definition:** New API/protocol built on **HTTP/3 (QUIC)** — combines WebSocket + WebRTC benefits.

**Key features:**
- Bidirectional streams
- Optional unreliable delivery (like UDP)
- Multiple independent streams (no HOL blocking)
- Built-in security (QUIC/TLS)

**Status:** Still evolving, limited browser support — not yet mainstream in production.

| | WebSocket | WebRTC | WebTransport |
|---|---|---|---|
| Protocol | TCP | UDP + ICE | QUIC (HTTP/3) |
| Setup | Easy | Complex | Medium |
| Reliability | Always | Optional | Optional |
| Streams | Single | Multiple | Multiple |

---

## 24. Head-of-Line (HOL) Blocking

**Definition:** One lost/slow packet blocks all packets behind it (TCP ordering requirement).

**Affected by:** HTTP/1.1, HTTP/2 (partial), WebSockets (all TCP-based).

**Solved by:** HTTP/3 (QUIC) — independent streams, packet loss only affects that stream.

| Protocol | HOL Blocking |
|---|---|
| TCP / HTTP/1.1 / WebSocket | Yes ❌ |
| HTTP/2 | Partial ⚠️ |
| HTTP/3 / QUIC / WebTransport | No ✅ |

---

## 25. First Connection Protocol Summary

| Technology | First Connection |
|---|---|
| WebSocket | HTTP → 101 Upgrade → ws/wss |
| SSE | HTTP only (no upgrade) |
| WebRTC | HTTP/WebSocket for signaling only; P2P after |
| WebTransport | HTTP/3 (QUIC) |

---

## 26. Quick Concept Map

```
Real-Time Communication
├── WebSockets         → persistent, full-duplex, stateful
│   ├── Socket.IO      → wrapper with rooms, ACK, reconnect
│   └── ws             → low-level, performant
├── SSE                → one-way server push, HTTP only
├── WebRTC             → P2P media/data, uses WebSocket for signaling
├── WebTransport       → HTTP/3-based, future standard
└── Polling            → fallback, not truly real-time

Reliability Patterns
├── ACK + Retry        → at-least-once delivery
├── Message IDs        → deduplication for exactly-once
├── Ping/Pong          → ghost connection detection
└── Message Envelope   → structured, routable payloads

Scaling Patterns
├── Pub/Sub + Rooms    → multicast to groups
├── Message Brokers    → Redis, Kafka, RabbitMQ
├── Backpressure ctrl  → flow control, rate limiting
└── Unicast/Broadcast  → targeted vs. global delivery
```

---

*Interview tip: Always mention trade-offs. WebSockets are great for real-time but add server-side state management complexity. SSE is simpler but one-directional. WebRTC eliminates server load for media but requires STUN/TURN infrastructure.*
