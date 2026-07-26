

## API

| Method | Route                    | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/items                | List all items                       |
| POST   | /api/items                | Create an item                       |
| PUT    | /api/items/:id            | Update an item                       |
| DELETE | /api/items/:id            | Delete an item                       |
| POST   | /api/items/:id/stock      | Stock in/out `{ action, qty, note }` |
| GET    | /api/transactions         | List recent transactions             |
