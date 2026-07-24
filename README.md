# PeriphTrack

IT peripheral inventory tracker. Express + MongoDB backend, vanilla JS + Bootstrap 5 front-end.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `MONGODB_URI`
3. Make sure MongoDB is running (local `mongod` or a MongoDB Atlas cluster)
4. Load starting data: `npm run seed`
5. Start the server: `npm start` (or `npm run dev` for auto-restart while editing)
6. Open http://localhost:4000

## API

| Method | Route                    | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/items                | List all items                       |
| POST   | /api/items                | Create an item                       |
| PUT    | /api/items/:id            | Update an item                       |
| DELETE | /api/items/:id            | Delete an item                       |
| POST   | /api/items/:id/stock      | Stock in/out `{ action, qty, note }` |
| GET    | /api/transactions         | List recent transactions             |
