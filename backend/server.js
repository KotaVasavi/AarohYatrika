import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import userRoutes from './routes/userRoutes.js';

// --- Server Setup ---
dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // To accept JSON data

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('AarohYatrika API is running...');
});

// --- Error Handling Middleware (MUST BE AFTER ROUTES) ---
app.use(notFound);
app.use(errorHandler);

// --- Socket.io Server Setup ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173', // Your React app's URL
    methods: ['GET', 'POST'],
  },
});

// --- Socket.io Connection Logic ---
const userSocketMap = new Map(); // Maps userId to socket.id

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Store user connection
  socket.on('registerUser', (userId) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Driver joins a "zone" room
  socket.on('joinZoneRoom', (zone) => {
    socket.join(zone);
    console.log(`Socket ${socket.id} joined room: ${zone}`);
  });

  // Driver leaves a "zone" room
  socket.on('leaveZoneRoom', (zone) => {
    socket.leave(zone);
    console.log(`Socket ${socket.id} left room: ${zone}`);
  });
  
  // Rider requests a ride
  socket.on('requestRide', (rideDetails) => {
    io.to(rideDetails.fromZone).emit('newRideRequest', rideDetails);
    console.log(`Ride request emitted to room: ${rideDetails.fromZone}`);
  });

  // Driver accepts a ride
  socket.on('acceptRide', (data) => {
    const riderSocketId = userSocketMap.get(data.ride.rider._id || data.ride.rider);
    if (riderSocketId) {
      io.to(riderSocketId).emit('rideAccepted', data);
      console.log(`Notifying rider ${data.ride.rider._id} at socket ${riderSocketId}`);
    }
  });

  // --- In-App Chat Logic ---
  socket.on('joinChatRoom', (rideId) => {
    socket.join(rideId);
    console.log(`Socket ${socket.id} joined chat room: ${rideId}`);
  });

  
  socket.on('leaveChatRoom', (rideId) => {
    socket.leave(rideId);
    console.log(`Socket ${socket.id} left chat room: ${rideId}`);
  });

  socket.on('sendMessage', (data) => {
    
    io.to(data.rideId).emit('receiveMessage', data.message);
  });
  
  socket.on('rideUpdate', (data) => {
    const riderSocket = userSocketMap.get(data.riderId);
    const driverSocket = userSocketMap.get(data.driverId);

    if (riderSocket) {
      io.to(riderSocket).emit('rideStatusChanged', { status: data.status, rideId: data.rideId });
    }
    if (driverSocket) {
      io.to(driverSocket).emit('rideStatusChanged', { status: data.status, rideId: data.rideId });
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of userSocketMap.entries()) {
      if (socketId === socket.id) {
        userSocketMap.delete(userId);
        break;
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () =>
  console.log(`Server running on port ${PORT} and connected to MongoDB`)
);