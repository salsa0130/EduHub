const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  completedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  avatar: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  socialLinks: {
    website: String,
    twitter: String,
    linkedin: String,
    github: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total courses enrolled
userSchema.virtual('totalEnrolledCourses').get(function() {
  return this.enrolledCourses ? this.enrolledCourses.length : 0;
});

// Virtual for total courses completed
userSchema.virtual('totalCompletedCourses').get(function() {
  return this.completedCourses ? this.completedCourses.length : 0;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to enroll in a course
userSchema.methods.enrollInCourse = async function(courseId) {
  if (!this.enrolledCourses.includes(courseId)) {
    this.enrolledCourses.push(courseId);
    await this.save();
  }
  return this;
};

// Method to unenroll from a course
userSchema.methods.unenrollFromCourse = async function(courseId) {
  this.enrolledCourses = this.enrolledCourses.filter(
    id => id.toString() !== courseId.toString()
  );
  await this.save();
  return this;
};

// Method to mark course as completed
userSchema.methods.completeCourse = async function(courseId) {
  if (!this.completedCourses.includes(courseId)) {
    this.completedCourses.push(courseId);
    await this.save();
  }
  return this;
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
  return this;
};

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ enrolledCourses: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);