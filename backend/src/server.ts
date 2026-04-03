// server.ts

import express, { Request, Response, NextFunction } from 'express'; // 导入 Express 框架
import mongoose from 'mongoose';
import cors from 'cors'; // 导入 CORS 中间件
import { createServer } from 'http';         // <-- 新增：引入 http 模块
import { Server, Socket } from 'socket.io';  // <-- 新增：引入 socket.io 的 Server
import Redis from 'ioredis';                 // <-- 新增：引入 ioredis

import config from './config/config'; // 导入配置文件
import authRoutes from './routes/authRoutes';
import sentenceRoutes from './routes/sentenceRoutes';
import vocabularyRoutes from './routes/vocabularyRoutes';
import taskRoutes from './routes/taskRoutes';

// 假设您有一个用于将任务添加到队列的模块和函数
// 如果您暂时没有这个 '/api/segment' 的需求，可以先注释掉addTaskToQueue的导入和相关路由
// import { addTaskToQueue } from './queue'; // <-- 示例：您可能需要创建这个

const app = express();

// 中间件
app.use(cors({
    origin: "http://localhost:5173", // 允许您的前端访问 (根据您的实际情况修改)
    methods: ["GET", "POST"],
    credentials: true
}));
app.use(express.json());

// --- 新增：创建 HTTP 服务器并将 Express 应用作为处理器 ---
const httpServer = createServer(app);

// --- 新增：将 Socket.IO 附加到 HTTP 服务器 ---
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173", // 确保与上面 Express 的 CORS 配置一致或兼容
        methods: ["GET", "POST"],
        credentials: true
    }
});

// --- 新增：Socket.IO 连接逻辑 ---
// 'io.on('connection', callback)' 是一个事件监听器。
// 每当有一个新的前端客户端成功建立 WebSocket 连接时，这个 'callback' 函数就会被触发。
// 'socket' 参数就代表那个刚刚连接上的、独一无二的客户端。
io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // 监听来自客户端的 'subscribe-to-task' 事件
    socket.on('subscribe-to-task', (taskId: string) => {
        console.log(`Socket ${socket.id} is subscribing to task ${taskId}`);
        socket.join(taskId); // 将客户端放入以 taskId 命名的房间
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// --- 新增：Redis Pub/Sub 监听器 ---
const redisHost = process.env.REDIS_HOST || 'redis'; // Docker Compose中的服务名
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

console.log(`Attempting to connect to Redis at ${redisHost}:${redisPort}`);

const redisSubscriber = new Redis({
    host: redisHost,
    port: redisPort,
    // 增加重试策略，以便在Redis暂时不可用时自动重连
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000); // 每次延迟增加50ms，最大2秒
        console.log(`Redis connection attempt ${times}. Retrying in ${delay}ms`);
        return delay;
    },
    maxRetriesPerRequest: null, // 允许无限次重试连接（直到成功或手动停止）
    enableReadyCheck: true,
    connectTimeout: 10000 // 10秒连接超时
});

const resultsChannel = 'results-channel';

redisSubscriber.on('connect', () => {
    console.log('Redis subscriber connected successfully.');
    redisSubscriber.subscribe(resultsChannel, (err, count) => {
        if (err) {
            console.error('Failed to subscribe to Redis channel:', err);
        } else {
            console.log(`Subscribed to Redis channel: '${resultsChannel}'. Number of subscribed channels: ${count}`);
        }
    });
});

redisSubscriber.on('error', (err) => {
    console.error('Redis subscriber connection error:', err);
    // 在这里可以添加更复杂的错误处理逻辑，比如通知系统管理员
});


// 当从订阅的 channel 收到消息时触发
redisSubscriber.on('message', (channel: string, message: string) => {
    console.log(`Received message from channel '${channel}':`, message);
    try {
        const result = JSON.parse(message);
        const { taskId } = result; // 假设消息体中总是有 taskId

        if (taskId) {
            // 向 taskId 对应的房间广播 'task-completed' 事件
            io.to(taskId).emit('task-completed', result);
            console.log(`Emitted 'task-completed' for taskId: ${taskId} to room ${taskId}`);
        } else {
            console.warn("Received message without taskId, cannot emit to specific room:", result);
        }
    } catch (e) {
        console.error("Failed to parse message or emit to socket:", e, "Original message:", message);
    }
});


// --- 原有路由 ---
app.get('/api', (req: Request, res: Response) => {
    res.json({ message: '词汇学习系统API (WebSocket Enabled)' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sentences', sentenceRoutes);
app.use('/api/vocabulary', vocabularyRoutes);

// --- 新增/修改：用于触发异步任务的示例 API 端点 ---
// 您需要确保 addTaskToQueue 函数存在并且 './queue' 模块被正确创建和导入
// 如果您暂时不需要这个功能，可以注释掉下面这个路由
app.use('/api/tasks', taskRoutes);


// 连接数据库并启动服务器
mongoose
    .connect(config.mongoURI)
    .then(() => {
        console.log('MongoDB 连接成功...');
        // --- 修改：使用 httpServer 启动服务器 ---
        httpServer.listen(config.port, () => {
            console.log(`服务器 (with Socket.IO) 运行在 http://localhost:${config.port}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB 连接失败:', err.message);
        process.exit(1); // 连接数据库失败时退出应用
    });

// 可选：优雅关闭
const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    redisSubscriber.quit(() => { // 或者 .disconnect() 取决于ioredis版本和需求
        console.log('Redis subscriber disconnected.');
        httpServer.close(() => {
            console.log('HTTP server closed.');
            mongoose.connection.close(false).then(() => {
                console.log('MongoDB connection closed.');
                process.exit(0);
            }).catch(err => {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            });
        });
    });
};

process.on('SIGTERM', gracefulShutdown); // 例如 supervisor, upstart
process.on('SIGINT', gracefulShutdown);  // 例如 Ctrl+C
