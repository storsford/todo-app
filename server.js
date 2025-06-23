// Import the Express framework
const express = require('express');

// Create an Express application
const app = express();

// Set the port number (where our server will listen)
const PORT = 3000;

// Middleware to parse JSON requests
// This allows our server to understand JSON data sent in requests
app.use(express.json());

// In-memory storage for our to-do items
// In a real app, this would be a database
let todos = [
  { id: 1, title: "Learn JavaScript", completed: false, createdAt: new Date().toISOString() },
  { id: 2, title: "Build a REST API", completed: false, createdAt: new Date().toISOString() }
];

// Helper function to generate unique IDs
let nextId = 3;
const generateId = () => nextId++;

// Helper function to find a todo by ID
const findTodoById = (id) => {
  return todos.find(todo => todo.id === parseInt(id));
};

// Helper function to find the index of a todo by ID
const findTodoIndexById = (id) => {
  return todos.findIndex(todo => todo.id === parseInt(id));
};

// ==================== ROUTES ====================

// 1. GET /todos - Get all to-do items
app.get('/todos', (req, res) => {
  console.log('📋 Getting all todos');
  
  // Optional query parameters for filtering
  const { completed, limit } = req.query;
  
  let filteredTodos = todos;
  
  // Filter by completion status if provided
  if (completed !== undefined) {
    const isCompleted = completed === 'true';
    filteredTodos = todos.filter(todo => todo.completed === isCompleted);
  }
  
  // Limit results if provided
  if (limit) {
    const limitNum = parseInt(limit);
    if (!isNaN(limitNum) && limitNum > 0) {
      filteredTodos = filteredTodos.slice(0, limitNum);
    }
  }
  
  res.json({
    success: true,
    count: filteredTodos.length,
    data: filteredTodos
  });
});

// 2. GET /todos/:id - Get a specific to-do item by ID
app.get('/todos/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🔍 Getting todo with ID: ${id}`);
  
  const todo = findTodoById(id);
  
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

// 3. POST /todos - Create a new to-do item
app.post('/todos', (req, res) => {
  console.log('➕ Creating new todo');
  
  const { title, completed = false } = req.body;
  
  // Validation: Check if title is provided
  if (!title || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Title is required and cannot be empty'
    });
  }
  
  // Create new todo object
  const newTodo = {
    id: generateId(),
    title: title.trim(),
    completed: Boolean(completed),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Add to our in-memory storage
  todos.push(newTodo);
  
  console.log(`✅ Created todo: ${newTodo.title}`);
  
  // Return the created todo with 201 status (Created)
  res.status(201).json({
    success: true,
    message: 'Todo created successfully',
    data: newTodo
  });
});

// 4. PUT /todos/:id - Update a complete to-do item
app.put('/todos/:id', (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;
  
  console.log(`✏️ Updating todo with ID: ${id}`);
  
  const todoIndex = findTodoIndexById(id);
  
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
  
  // Update the todo
  todos[todoIndex] = {
    ...todos[todoIndex],
    title: title.trim(),
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

// 5. PATCH /todos/:id - Partially update a to-do item
app.patch('/todos/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  console.log(`🔧 Partially updating todo with ID: ${id}`);
  
  const todoIndex = findTodoIndexById(id);
  
  if (todoIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Todo with ID ${id} not found`
    });
  }
  
  // Validate title if it's being updated
  if (updates.title !== undefined && (!updates.title || updates.title.trim() === '')) {
    return res.status(400).json({
      success: false,
      message: 'Title cannot be empty'
    });
  }
  
  // Apply updates
  if (updates.title !== undefined) {
    todos[todoIndex].title = updates.title.trim();
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

// 6. DELETE /todos/:id - Delete a specific to-do item
app.delete('/todos/:id', (req, res) => {
  const { id } = req.params;
  console.log(`🗑️ Deleting todo with ID: ${id}`);
  
  const todoIndex = findTodoIndexById(id);
  
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

// 7. DELETE /todos - Delete all to-do items
app.delete('/todos', (req, res) => {
  console.log('🗑️ Deleting all todos');
  
  const deletedCount = todos.length;
  todos = [];
  nextId = 1; // Reset ID counter
  
  console.log(`✅ Deleted ${deletedCount} todos`);
  
  res.json({
    success: true,
    message: `Deleted ${deletedCount} todos`,
    deletedCount
  });
});

// ==================== MIDDLEWARE ====================

// Handle 404 errors (route not found)
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

// Start the server
app.listen(PORT, () => {
  console.log('🚀 Server is running!');
  console.log(`📡 API available at: http://localhost:${PORT}`);
  console.log('📚 Available endpoints:');
  console.log('   GET    /todos        - Get all todos');
  console.log('   GET    /todos/:id    - Get specific todo');
  console.log('   POST   /todos        - Create new todo');
  console.log('   PUT    /todos/:id    - Update entire todo');
  console.log('   PATCH  /todos/:id    - Update part of todo');
  console.log('   DELETE /todos/:id    - Delete specific todo');
  console.log('   DELETE /todos        - Delete all todos');
  console.log('\n💡 Try making requests with Postman or curl!');
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