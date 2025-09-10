const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Course = require('../models/Course');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Sample courses data
const sampleCourses = [
  {
    title: "Complete JavaScript Mastery",
    description: "Master JavaScript from basics to advanced concepts. Learn ES6+, async programming, DOM manipulation, and modern JavaScript frameworks. Perfect for beginners and intermediate developers looking to enhance their skills.",
    instructor: "John Smith",
    category: "Programming",
    level: "Intermediate",
    price: 99.99,
    thumbnail: "https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    tags: ["javascript", "web development", "programming", "es6"],
    duration: "8 weeks",
    totalHours: 40,
    prerequisites: ["Basic HTML", "Basic CSS"],
    learningObjectives: [
      "Master JavaScript fundamentals and advanced concepts",
      "Build interactive web applications",
      "Understand asynchronous programming",
      "Work with modern JavaScript features"
    ],
    lessons: [
      {
        title: "Introduction to JavaScript",
        content: "Learn the basics of JavaScript, variables, and data types.",
        duration: 45,
        order: 1
      },
      {
        title: "Functions and Scope",
        content: "Understanding functions, scope, and closures in JavaScript.",
        duration: 60,
        order: 2
      }
    ],
    isFeatured: true
  },
  {
    title: "React Development Bootcamp",
    description: "Build modern web applications with React. Learn components, hooks, state management, routing, and deployment. Includes hands-on projects and real-world examples.",
    instructor: "Sarah Johnson",
    category: "Programming",
    level: "Intermediate",
    price: 149.99,
    thumbnail: "https://images.unsplash.com/photo-1622295023876-0cdf583c41f6?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fG9ubGluZSUyMGxlYXJuaW5nfGVufDB8fDB8fHww",
    tags: ["react", "frontend", "javascript", "web development"],
    duration: "10 weeks",
    totalHours: 55,
    prerequisites: ["JavaScript Fundamentals", "HTML/CSS"],
    learningObjectives: [
      "Build React applications from scratch",
      "Master React hooks and state management",
      "Implement routing and navigation",
      "Deploy React applications"
    ],
    isFeatured: true
  },
  {
    title: "Python Data Science Fundamentals",
    description: "Dive into data science with Python. Learn pandas, numpy, matplotlib, and scikit-learn. Analyze real datasets and build predictive models.",
    instructor: "Dr. Michael Chen",
    category: "Data Science",
    level: "Beginner",
    price: 199.99,
    thumbnail: "https://images.unsplash.com/photo-1616587894289-86480e533129?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzB8fG9ubGluZSUyMGxlYXJuaW5nfGVufDB8fDB8fHww",
    tags: ["python", "data science", "machine learning", "pandas"],
    duration: "12 weeks",
    totalHours: 60,
    prerequisites: ["Basic Python knowledge"],
    learningObjectives: [
      "Master Python data analysis libraries",
      "Visualize data effectively",
      "Build machine learning models",
      "Work with real-world datasets"
    ],
    isFeatured: true
  },
  {
    title: "UI/UX Design Principles",
    description: "Learn the fundamentals of user interface and user experience design. Understand design thinking, wireframing, prototyping, and user testing methodologies.",
    instructor: "Emma Wilson",
    category: "Design",
    level: "Beginner",
    price: 129.99,
    thumbnail: "https://images.unsplash.com/photo-1616587896649-79b16d8b173d?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTN8fG9ubGluZSUyMGxlYXJuaW5nfGVufDB8fDB8fHww",
    tags: ["design", "ui", "ux", "prototyping"],
    duration: "6 weeks",
    totalHours: 30,
    learningObjectives: [
      "Understand design principles",
      "Create user-centered designs",
      "Build wireframes and prototypes",
      "Conduct user research"
    ]
  },
  {
    title: "Digital Marketing Mastery",
    description: "Complete guide to digital marketing including SEO, social media marketing, email campaigns, and analytics. Learn to create effective marketing strategies.",
    instructor: "David Rodriguez",
    category: "Marketing",
    level: "Intermediate",
    price: 179.99,
    thumbnail: "https://images.unsplash.com/photo-1588873281272-14886ba1f737?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTMxfHxvbmxpbmUlMjBsZWFybmluZ3xlbnwwfHwwfHx8MA%3D%3D",
    tags: ["marketing", "seo", "social media", "analytics"],
    duration: "8 weeks",
    totalHours: 45
  },
  {
    title: "Node.js Backend Development",
    description: "Build scalable backend applications with Node.js and Express. Learn database integration, API development, authentication, and deployment.",
    instructor: "Alex Thompson",
    category: "Programming",
    level: "Advanced",
    price: 169.99,
    thumbnail: "https://images.unsplash.com/photo-1472220625704-91e1462799b2?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mzh8fGUlMjBsZWFybmluZ3xlbnwwfHwwfHx8MA%3D%3D",
    tags: ["nodejs", "backend", "express", "api"],
    duration: "10 weeks",
    totalHours: 50,
    prerequisites: ["JavaScript", "Basic web development"]
  },
  {
    title: "Machine Learning with TensorFlow",
    description: "Advanced machine learning course using TensorFlow. Build neural networks, work with deep learning models, and deploy ML applications.",
    instructor: "Dr. Lisa Zhang",
    category: "Data Science",
    level: "Advanced",
    price: 299.99,
    thumbnail: "https://images.unsplash.com/photo-1491975474562-1f4e30bc9468?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDB8fGUlMjBsZWFybmluZ3xlbnwwfHwwfHx8MA%3D%3D",
    tags: ["machine learning", "tensorflow", "neural networks", "deep learning"],
    duration: "16 weeks",
    totalHours: 80,
    prerequisites: ["Python", "Basic statistics", "Linear algebra"]
  },
  {
    title: "Mobile App Development with React Native",
    description: "Create cross-platform mobile apps with React Native. Learn navigation, state management, native modules, and app store deployment.",
    instructor: "James Park",
    category: "Programming",
    level: "Intermediate",
    price: 189.99,
    thumbnail: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NTF8fGUlMjBsZWFybmluZ3xlbnwwfHwwfHx8MA%3D%3D",
    tags: ["react native", "mobile development", "ios", "android"],
    duration: "12 weeks",
    totalHours: 65
  }
];

// Sample users data
const sampleUsers = [
  {
    name: "Demo User",
    email: "demo@eduhub.com",
    password: "demo123",
    role: "student"
  },
  {
    name: "John Smith",
    email: "john.smith@eduhub.com",
    password: "instructor123",
    role: "instructor",
    bio: "Full-stack developer with 8+ years of experience. Passionate about teaching JavaScript and modern web development."
  },
  {
    name: "Admin User",
    email: "admin@eduhub.com",
    password: "admin123",
    role: "admin"
  }
];

// Seed function
const seedData = async () => {
  try {
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Course.deleteMany({});

    // Create users
    console.log('Creating users...');
    const users = await User.create(sampleUsers);
    console.log(`Created ${users.length} users`);

    // Find instructor users
    const instructors = users.filter(user => user.role === 'instructor');
    
    // Add instructor IDs to courses
    const coursesWithInstructors = sampleCourses.map((course, index) => ({
      ...course,
      instructorId: instructors[index % instructors.length]?._id || users[0]._id
    }));

    // Create courses
    console.log('Creating courses...');
    const courses = await Course.create(coursesWithInstructors);
    console.log(`Created ${courses.length} courses`);

    // Enroll demo user in some courses
    const demoUser = users.find(user => user.email === 'demo@eduhub.com');
    if (demoUser && courses.length > 0) {
      const coursesToEnroll = courses.slice(0, 3); // Enroll in first 3 courses
      
      for (const course of coursesToEnroll) {
        await course.enrollStudent(demoUser._id);
        await demoUser.enrollInCourse(course._id);
      }
      
      // Mark one course as completed
      await demoUser.completeCourse(coursesToEnroll[0]._id);
      
      console.log(`Demo user enrolled in ${coursesToEnroll.length} courses`);
    }

    // Add some reviews
    if (courses.length > 0 && users.length > 0) {
      console.log('Adding sample reviews...');
      await courses[0].addReview(users[0]._id, 5, "Excellent course! Learned a lot about JavaScript.");
      await courses[0].addReview(users[1]._id, 4, "Great content and examples. Would recommend!");
      await courses[1].addReview(users[0]._id, 5, "Best React course I've taken. Very comprehensive.");
    }

    console.log('✅ Sample data seeded successfully!');
    console.log('\n📚 Demo Login Credentials:');
    console.log('Email: demo@eduhub.com');
    console.log('Password: demo123');
    console.log('\n👨‍🏫 Instructor Login:');
    console.log('Email: john.smith@eduhub.com');
    console.log('Password: instructor123');
    console.log('\n👑 Admin Login:');
    console.log('Email: admin@eduhub.com');
    console.log('Password: admin123');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the seeder
const runSeeder = async () => {
  await connectDB();
  await seedData();
};

// Check if script is run directly
if (require.main === module) {
  runSeeder();
}

module.exports = { seedData, sampleCourses, sampleUsers };