// Import required modules
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// JWT Secret (In production, use environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:5500', '*'],
  credentials: true
}));

// Serve static files (for frontend)
app.use(express.static('public'));

// In-memory storage (In production, use a real database)
let users = [
  {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: '$2a$10$N9qo8uLOickgx2ZMRZoMye.Ky7vdcE5vQVZl3eAcxl7cHQgzKEJOC' // 'password123'
  }
];

let todos = [
  {
    id: 1,
    userId: 1,
    title: "Learn JavaScript",
    description: "Complete the JavaScript fundamentals course and practice with coding exercises",
    dueDate: "2024-07-15",
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    userId: 1,
    title: "Build REST API",
    description: "Create a complete REST API with Node.js and Express for the todo application",
    dueDate: "2024-07-20",
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper functions
let nextUserId = 2;
let nextTodoId = 3;

const generateUserId = () => nextUserId++;
const generateTodoId = () => nextTodoId++;

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// ==================== AUTHENTICATION ROUTES ====================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: generateUserId(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ New user registered: ${newUser.username}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }


    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`✅ User logged in: ${user.username}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Forgot Password - Request reset token
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.'
      });
    }

    // Generate reset token (6-digit code for simplicity)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token (in production, store in database)
    user.resetToken = resetToken;
    user.resetExpires = resetExpires;

    // In production, send actual email here
    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
    console.log(`⏰ Token expires at: ${resetExpires}`);

    res.json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
      // Remove this in production - only for testing
      devToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset Password - Use token to set new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, token, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Check token and expiration
    if (user.resetToken !== token || !user.resetExpires || new Date() > user.resetExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    delete user.resetToken;
    delete user.resetExpires;

    console.log(`✅ Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== TODO ROUTES (Protected) ====================

// Get all todos for authenticated user
app.get('/api/todos', authenticateToken, (req, res) => {
  console.log(`📋 Getting todos for user: ${req.user.username}`);
  
  const { completed, limit, sortBy = 'createdAt', order = 'desc' } = req.query;
  
  // Filter todos by user
  let userTodos = todos.filter(todo => todo.userId === req.user.userId);
  
  // Filter by completion status if provided
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    userTodos = userTodos.filter(todo => todo.completed === isCompleted);
  }
  
  // Sort todos
  userTodos.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === 'dueDate') {
      aValue = new Date(aValue || '9999-12-31');
      bValue = new Date(bValue || '9999-12-31');
    }
    
    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // Limit results if provided
  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) {
      userTodos = userTodos.slice(0, limitNum);
    }
  }
  
  res.json({
    success: true,
    count: userTodos.length,
    data: userTodos
  });
});

// Get specific todo by ID
app.get('/api/todos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  console.log(`🔍 Getting todo ${id} for user: ${req.user.username}`);
  
  const todo = todos.find(t => t.id === parseInt(id) && t.userId === req.user.userId);
  
  if (!todo) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${id} not found`
    });
  }
  
  res.json({
    success: true,
    data: todo
  });
});

// Create new todo
app.post('/api/todos', authenticateToken, (req, res) => {
  console.log(`➕ Creating todo for user: ${req.user.username}`);
  
  const { title, description = '', dueDate, completed = false } = req.body;
  
  // Validation
  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Title is required and cannot be empty'
    });
  }
  
  // Validate due date format if provided
  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).json({
      success: false,
      message: 'Due date must be in YYYY-MM-DD format'
    });
  }
  
  // Create new todo
  const newTodo = {
    id: generateTodoId(),
    userId: req.user.userId,
    title: title.trim(),
    description: description.trim(),
    dueDate: dueDate || null,
    completed: Boolean(completed),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  todos.push(newTodo);
  
  console.log(`✅ Created todo: ${newTodo.title}`);
  
  res.status(201).json({
    success: true,
    message: 'Todo created successfully',
    data: newTodo
  });
});

// Update todo (PUT - full update)
app.put('/api/todos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { title, description = '', dueDate, completed } = req.body;
  
  console.log(`✏️ Updating todo ${id} for user: ${req.user.username}`);
  
  const todoIndex = todos.findIndex(t => t.id === parseInt(id) && t.userId === req.user.userId);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${id} not found`
    });
  }
  
  // Validation
  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Title is required and cannot be empty'
    });
  }
  
  if (dueDate && !isValidDate(dueDate)) {
    return res.status(400).json({
      success: false,
      message: 'Due date must be in YYYY-MM-DD format'
    });
  }
  
  // Update todo
  todos[todoIndex] = {
    ...todos[todoIndex],
    title: title.trim(),
    description: description.trim(),
    dueDate: dueDate || null,
    completed: Boolean(completed),
    updatedAt: new Date().toISOString()
  };
  
  console.log(`✅ Updated todo: ${todos[todoIndex].title}`);
  
  res.json({
    success: true,
    message: 'Todo updated successfully',
    data: todos[todoIndex]
  });
});

// Partially update todo (PATCH)
app.patch('/api/todos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  console.log(`🔧 Partially updating todo ${id} for user: ${req.user.username}`);
  
  const todoIndex = todos.findIndex(t => t.id === parseInt(id) && t.userId === req.user.userId);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${id} not found`
    });
  }
  
  // Validate updates
  if (updates.title !== undefined && (!updates.title || updates.title.trim() === '')) {
    return res.status(400).json({
      success: false,
      message: 'Title cannot be empty'
    });
  }
  
  if (updates.dueDate && !isValidDate(updates.dueDate)) {
    return res.status(400).json({
      success: false,
      message: 'Due date must be in YYYY-MM-DD format'
    });
  }
  
  // Apply updates
  if (updates.title !== undefined) {
    todos[todoIndex].title = updates.title.trim();
  }
  
  if (updates.description !== undefined) {
    todos[todoIndex].description = updates.description.trim();
  }
  
  if (updates.dueDate !== undefined) {
    todos[todoIndex].dueDate = updates.dueDate || null;
  }
  
  if (updates.completed !== undefined) {
    todos[todoIndex].completed = Boolean(updates.completed);
  }
  
  todos[todoIndex].updatedAt = new Date().toISOString();
  
  console.log(`✅ Partially updated todo: ${todos[todoIndex].title}`);
  
  res.json({
    success: true,
    message: 'Todo updated successfully',
    data: todos[todoIndex]
  });
});

// Delete specific todo
app.delete('/api/todos/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Deleting todo ${id} for user: ${req.user.username}`);
  
  const todoIndex = todos.findIndex(t => t.id === parseInt(id) && t.userId === req.user.userId);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${id} not found`
    });
  }
  
  const deletedTodo = todos[todoIndex];
  todos.splice(todoIndex, 1);
  
  console.log(`✅ Deleted todo: ${deletedTodo.title}`);
  
  res.json({
    success: true,
    message: 'Todo deleted successfully',
    data: deletedTodo
  });
});

// Delete all todos for user
app.delete('/api/todos', authenticateToken, (req, res) => {
  console.log(`🗑️ Deleting all todos for user: ${req.user.username}`);
  
  const userTodos = todos.filter(t => t.userId === req.user.userId);
  const deletedCount = userTodos.length;
  
  todos = todos.filter(t => t.userId !== req.user.userId);
  
  console.log(`✅ Deleted ${deletedCount} todos`);
  
  res.json({
    success: true,
    message: `Deleted ${deletedCount} todos`,
    deletedCount
  });
});

// ==================== UTILITY FUNCTIONS ====================

// Validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) return false;
  
  return date.toISOString().startsWith(dateString);
}

// ==================== FRONTEND ROUTE ====================

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== ERROR HANDLING ====================

// Handle 404 errors
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log('🚀 Enhanced Todo API Server is running!');
  console.log(`📡 API available at: http://localhost:${PORT}`);
  console.log(`🌐 Frontend available at: http://localhost:${PORT}`);
  console.log('📚 Available endpoints:');
  console.log('   POST   /api/auth/register  - Register new user');
  console.log('   POST   /api/auth/login     - Login user');
  console.log('   GET    /api/todos          - Get all todos (protected)');
  console.log('   GET    /api/todos/:id      - Get specific todo (protected)');
  console.log('   POST   /api/todos          - Create new todo (protected)');
  console.log('   PUT    /api/todos/:id      - Update entire todo (protected)');
  console.log('   PATCH  /api/todos/:id      - Update part of todo (protected)');
  console.log('   DELETE /api/todos/:id      - Delete specific todo (protected)');
  console.log('   DELETE /api/todos          - Delete all todos (protected)');
  console.log('\n🔐 Authentication required for todo endpoints');
  console.log('💡 Use "Bearer <token>" in Authorization header');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully');
  process.exit(0);
});