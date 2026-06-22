# Socket.io Event Catalog

> **Status:** Draft v0.1
> **Library:** Socket.io (NestJS Gateway + React/Expo client)
> **Dokumen terkait:** `api-spec.md` (REST endpoints), `prd.md` FR-24/25

---

## 1. Arsitektur Koneksi

### Setup NestJS Gateway
```ts
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class NotificationsGateway {
  @WebSocketServer() server: Server;
}
```

### Auth Handshake
Client mengirim access token saat connect (bukan setelah):
```ts
// Client (Next.js / React Native)
const socket = io(SOCKET_URL, {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

Server validasi token di `handleConnection()` — jika invalid → `socket.disconnect()`.

### Struktur Room
Setiap client join **dua room** setelah autentikasi berhasil:

| Room | Format | Penerima |
|---|---|---|
| Doctor room | `doctor:{doctorProfileId}` | Semua anggota aktif doctorProfile |
| User room | `user:{userId}` | Hanya user yang bersangkutan (notifikasi personal) |

```ts
// Server — handleConnection
async handleConnection(socket: Socket) {
  const user = validateToken(socket.handshake.auth.token);
  const memberships = await getMemberships(user.id); // status: active
  
  socket.join(`user:${user.id}`);
  for (const m of memberships) {
    socket.join(`doctor:${m.doctorProfileId}`);
  }
}
```

---

## 2. Pola Emit di Service Layer

Setiap service yang melakukan mutation bertanggung jawab emit event **setelah** transaksi DB berhasil (bukan sebelum — untuk menghindari race condition jika transaksi rollback):

```ts
// Contoh di TripsService
async createTrip(dto, actorUser) {
  const trip = await this.prisma.trip.create({ data: dto });
  
  // Emit SETELAH commit
  this.gateway.server
    .to(`doctor:${trip.doctorProfileId}`)
    .emit('trip.created', { data: toTripSummary(trip), actorId: actorUser.id });
  
  return trip;
}
```

`actorId` disertakan agar client bisa mengabaikan event dari dirinya sendiri jika diperlukan (untuk mencegah double-update di UI).

---

## 3. Server-Emitted Events (Server → Client)

Format semua payload: `{ data: EntityShape, actorId: string }` — kecuali untuk event delete yang hanya butuh ID.

---

### 3.1 Trips

#### `trip.created`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /trips` sukses
```ts
{ data: TripSummary; actorId: string }
```

#### `trip.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /trips/:id` sukses
```ts
{ data: TripDetail; actorId: string }
```

#### `trip.deleted`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /trips/:id` sukses
```ts
{ data: { id: string; doctorProfileId: string }; actorId: string }
```

#### `trip.statusChanged`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** Background job `trip-status-sync` setelah update status otomatis
```ts
{ data: { id: string; doctorProfileId: string; status: TripStatus }; actorId: 'system' }
```

> `actorId: 'system'` menandakan perubahan otomatis (bukan dari user action).

---

### 3.2 Schedule Events

#### `schedule_event.created`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /schedule-events` sukses
```ts
{ data: ScheduleEventDetail; actorId: string }
```

#### `schedule_event.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /schedule-events/:id` sukses
```ts
{ data: ScheduleEventDetail; actorId: string }
```

#### `schedule_event.deleted`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /schedule-events/:id` sukses
```ts
{ data: { id: string; doctorProfileId: string; tripId: string | null }; actorId: string }
```

#### `schedule_event.statusChanged`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /schedule-events/:id/confirm` sukses
```ts
{ data: { id: string; doctorProfileId: string; status: 'confirmed' }; actorId: string }
```

---

### 3.3 Hotels

#### `hotel.created`
**Room:** `doctor:{doctorProfileId}` (resolve dari `trip.doctorProfileId`)
**Trigger:** `POST /trips/:tripId/hotels` sukses
```ts
{ data: HotelDetail; actorId: string }
```

#### `hotel.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /hotels/:id` sukses
```ts
{ data: HotelDetail; actorId: string }
```

#### `hotel.deleted`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /hotels/:id` sukses
```ts
{ data: { id: string; tripId: string }; actorId: string }
```

---

### 3.4 Packing

#### `packing_item.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /packing-items/:id` sukses
```ts
{
  data: {
    tripId: string;
    packingListId: string;
    item: PackingItem;
    progress: { packed: number; total: number };
  };
  actorId: string;
}
```

> `progress` disertakan agar progress bar di client bisa diupdate tanpa re-fetch seluruh list.

#### `packing_item.created`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /trips/:tripId/packing-list/items` sukses
```ts
{ data: { tripId: string; packingListId: string; item: PackingItem }; actorId: string }
```

#### `packing_item.deleted`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /packing-items/:id` sukses
```ts
{ data: { id: string; packingListId: string; tripId: string }; actorId: string }
```

#### `packing_list.templateLoaded`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /trips/:tripId/packing-list/load-template` sukses
```ts
{ data: PackingListDetail; actorId: string }
```

> Full list dikirim karena banyak item berubah sekaligus.

---

### 3.5 Tasks

#### `task.created`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /tasks` sukses
```ts
{ data: TaskDetail; actorId: string }
```

#### `task.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /tasks/:id` sukses
```ts
{ data: TaskDetail; actorId: string }
```

#### `task.deleted`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /tasks/:id` sukses
```ts
{ data: { id: string; doctorProfileId: string; tripId: string | null }; actorId: string }
```

---

### 3.6 Members/Team

#### `member.invited`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `POST /doctor-profiles/:doctorProfileId/members/invite` sukses
```ts
{ data: MembershipDetail; actorId: string }
```

#### `member.updated`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `PATCH /doctor-profiles/:doctorProfileId/members/:userId` sukses
```ts
{ data: MembershipDetail; actorId: string }
```

#### `member.revoked`
**Room:** `doctor:{doctorProfileId}`
**Trigger:** `DELETE /doctor-profiles/:doctorProfileId/members/:userId` sukses
```ts
{ data: { userId: string; doctorProfileId: string }; actorId: string }
```

> Client yang menerima `member.revoked` dengan `data.userId === currentUserId` harus logout dan redirect ke halaman login.

---

### 3.7 Notifications (Personal)

#### `notification.created`
**Room:** `user:{recipientUserId}` (bukan doctor room)
**Trigger:** Background job `reminder-dispatch` setelah reminder sukses terkirim
```ts
{ data: NotificationDetail }
```

> Event ini dikirim ke user room (personal), bukan ke doctor room — karena notifikasi bersifat personal per user.

---

## 4. Client-Emitted Events

Minimal — sebagian besar interaksi melalui REST API. Hanya satu event yang perlu dikirim client ke server:

#### `ping` (built-in Socket.io)
Digunakan oleh Socket.io sendiri untuk keep-alive. Tidak perlu implementasi manual.

---

## 5. Error Handling di Client

```ts
socket.on('connect_error', (err) => {
  if (err.message === 'unauthorized') {
    // Token expired → refresh dulu, lalu reconnect
    refreshAccessToken().then((newToken) => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server yang disconnect — jangan auto-reconnect sebelum refresh token
  }
  // Jika reason lain (network drop, dll) → Socket.io auto-reconnect
});
```

---

## 6. Pola Cache Invalidation di Client (React Query)

Setelah menerima socket event, client **tidak perlu re-fetch seluruh data** — cukup update cache React Query secara targeted:

```ts
// Contoh: hotel.created
socket.on('hotel.created', ({ data: hotel }) => {
  queryClient.setQueryData(
    ['hotels', hotel.tripId],
    (prev: HotelDetail[]) => [...(prev ?? []), hotel]
  );
  // Invalidate trip summary untuk update _meta.hotelCount
  queryClient.invalidateQueries({ queryKey: ['trips', hotel.tripId] });
  
  // Toast jika bukan dari diri sendiri
  if (actorId !== currentUserId) {
    toast.info(`Hotel baru ditambahkan ke trip ini`);
  }
});

// Contoh: trip.deleted
socket.on('trip.deleted', ({ data }) => {
  queryClient.removeQueries({ queryKey: ['trips', data.id] });
  queryClient.invalidateQueries({ queryKey: ['trips'] });
});
```

**Query key conventions:**
| Data | Query Key |
|---|---|
| List trips | `['trips', { doctorProfileId }]` |
| Single trip | `['trips', tripId]` |
| Schedule events | `['schedule-events', { doctorProfileId, ...filters }]` |
| Hotels by trip | `['hotels', tripId]` |
| Packing list | `['packing-list', tripId]` |
| Tasks | `['tasks', { doctorProfileId, ...filters }]` |
| Notifications | `['notifications', userId]` |
| Unread count | `['notifications', userId, 'unread-count']` |