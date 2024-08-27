import express, { Request, Response } from 'express';
import cors from 'cors';
// import routes from './routes';

const app = express();
const port = 8080;

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(routes);

app.get('/', async (req: Request, res: Response) => {
    res.json({ 'itsworking': 'yes it DID work HAHAHA' });
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
