## API

| Method | Route                    | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | /api/items                | List all items                       |
| POST   | /api/items                | Create an item                       |
| PUT    | /api/items/:id            | Update an item                       |
| DELETE | /api/items/:id            | Delete an item                       |
| POST   | /api/items/:id/stock      | Stock in/out `{ action, qty, note }` |
| GET    | /api/transactions         | List recent transactions             |

//models/Item.js
Defines what infomration gets saved or is required for each inventory item

//models/Transactions.js 
Defines what gets saved every time stock is added or removed

//public/app.js 
The code that makes the webpage actually work/responsive;
loads the item list, history from db, updating whats on screen, responding when a button is clicked

//public/index.html
the webpage itself layout button tables anything that is visual to the user

//routes/items.js 
handles everything related to items: showing the full list, adding a new item, editing one, deleting one, and recording a stock in/out

//routes/transactions.js
handles showing the history of stock changes (whats added/removed) & when

//seed.js
one time script used that filled the db 

//server.js
main starter file what makes everything work 
connects to db and makes webpage available using localhost:4000

As an example, here's what happens, file by file, when someone clicks “Stock In” on an item:
•	public/index.html — the Stock In button and pop-up form are already sitting on the page
•	public/app.js — notices the click, reads the quantity typed in, and sends that information to the back end
•	routes/items.js — receives that request, finds the right item, and updates its quantity
•	models/Item.js and models/Transaction.js — define how that updated item and the new history entry get saved
•	public/app.js — asks for the fresh data and updates the screen so the new quantity shows up right away
