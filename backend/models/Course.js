const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Lesson content is required']
  },
  videoUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid video URL format'
    }
  },
  duration: {
    type: Number, // in minutes
    min: [1, 'Duration must be at least 1 minute']
  },
  order: {
    type: Number,
    required: true
  },
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'link', 'download', 'other']
    }
  }]
}, {
  timestamps: true
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructor: {
    type: String,
    required: [true, 'Instructor name is required'],
    trim: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for now
  },
  category: {
    type: String,
    required: [true, 'Course category is required'],
    enum: [
      'Programming', 
      'Data Science', 
      'Design', 
      'Business', 
      'Marketing', 
      'Photography', 
      'Music', 
      'Language',
      'Health',
      'Science',
      'Mathematics',
      'Other'
    ]
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: [true, 'Course level is required']
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  thumbnail: {
    type: String,
    validate: {
      validator: function(v) {
        // Allow any valid HTTP(S) URL; file extension is not required
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid thumbnail URL format'
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  duration: {
    type: String, // e.g., "4 weeks", "Self-paced"
    default: 'Self-paced'
  },
  totalHours: {
    type: Number,
    min: [0, 'Total hours cannot be negative']
  },
  lessons: [lessonSchema],
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    comment: {
      type: String,
      maxlength: [500, 'Review comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  prerequisites: [{
    type: String,
    trim: true
  }],
  learningObjectives: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  completionCertificate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total enrolled students
courseSchema.virtual('totalEnrolled').get(function() {
  return this.enrolledStudents ? this.enrolledStudents.length : 0;
});

// Virtual for total lessons
courseSchema.virtual('totalLessons').get(function() {
  return this.lessons ? this.lessons.length : 0;
});

// Method to enroll a student
courseSchema.methods.enrollStudent = async function(studentId) {
  if (!this.enrolledStudents.includes(studentId)) {
    this.enrolledStudents.push(studentId);
    await this.save();
  }
  return this;
};

// Method to unenroll a student
courseSchema.methods.unenrollStudent = async function(studentId) {
  this.enrolledStudents = this.enrolledStudents.filter(
    id => id.toString() !== studentId.toString()
  );
  await this.save();
  return this;
};

// Method to add a review
courseSchema.methods.addReview = async function(userId, rating, comment) {
  // Remove existing review from this user
  this.reviews = this.reviews.filter(
    review => review.user.toString() !== userId.toString()
  );
  
  // Add new review
  this.reviews.push({
    user: userId,
    rating,
    comment
  });
  
  // Recalculate average rating
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
  this.rating.average = totalRating / this.reviews.length;
  this.rating.count = this.reviews.length;
  
  await this.save();
  return this;
};

// Static method to get featured courses
courseSchema.statics.getFeatured = function() {
  return this.find({ isFeatured: true, isPublished: true })
    .sort({ createdAt: -1 })
    .limit(6);
};

// Static method to get courses by category
courseSchema.statics.getByCategory = function(category) {
  return this.find({ category, isPublished: true })
    .sort({ rating: -1, createdAt: -1 });
};

// Indexes for better query performance
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ 'rating.average': -1 });
courseSchema.index({ createdAt: -1 });
courseSchema.index({ tags: 1 });
courseSchema.index({ isPublished: 1, isFeatured: 1 });

module.exports = mongoose.model('Course', courseSchema);