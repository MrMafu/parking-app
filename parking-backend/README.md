# parking-backend
Backing some ends here (this is the worst joke ever)

Uses Hono and Prisma
## Getting Started
1. Clone this repository
2. Install dependencies:
```
npm i
```
3. Create a new file: .env
4. Add your connection string database from your Prisma Postgres Database:
```
DATABASE_URL:"postgres://url_example"
```
5. Run these commands:
```
npx prisma migrate dev --name init
npx prisma generate
```
6. You can finally run the server:
```
npm run dev
```
7. Open http://localhost:3000 to see yourself!