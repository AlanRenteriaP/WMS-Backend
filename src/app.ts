import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import routes from './routes'; // Ensure this imports your route definitions correctly
import dotenv from 'dotenv';

// Initialize dotenv to load environment variables from a .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 8080; // Use the port from environment variables or default to 8080

// CORS configuration to allow credentials and set the origin for development
app.use(cors({
    origin: 'http://localhost:3000', // Adjust this to match your front-end URL
    credentials: true // Allows cookies to be sent and handled across origins
}));

// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies (as sent by API clients)
app.use(express.json());

// Middleware to parse cookies from the HTTP headers
app.use(cookieParser());

// Mount your routes
app.use(routes);

// Simple test route to check if the server is running
app.get('/', async (req: Request, res: Response) => {
    res.json({ message: 'It\'s working! Yes, it did work HAHAHA!' });
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
