const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @desc    Get all courses with optional filtering
// @route   GET /api/courses
// @access  Public
router.get('/', [
  query('category').optional().isIn(['Programming', 'Data Science', 'Design', 'Business', 'Marketing', 'Photography', 'Music', 'Language', 'Health', 'Science', 'Mathematics', 'Other']),
  query('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
  query('minPrice').optional().isNumeric().withMessage('Min price must be a number'),
  query('maxPrice').optional().isNumeric().withMessage('Max price must be a number'),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    const {
      category,
      level,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 12,
      sort = '-createdAt'
    } = req.query;

    // Build query
    let query = { isPublished: true };

    if (category) query.category = category;
    if (level) query.level = level;
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { instructor: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Execute query with pagination
    const courses = await Course.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-lessons -reviews'); // Exclude heavy fields for list view

    const total = await Course.countDocuments(query);
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      count: courses.length,
      total,
      pages,
      currentPage: parseInt(page),
      courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Server error while fetching courses' });
  }
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('reviews.user', 'name avatar')
      .populate('instructorId', 'name bio avatar');

    if (!course || !course.isPublished) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is enrolled (if user is logged in)
    let isEnrolled = false;
    if (req.user) {
      isEnrolled = course.enrolledStudents.includes(req.user.id);
    }

    res.json({
      success: true,
      course: {
        ...course.toObject(),
        isEnrolled
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Server error while fetching course' });
  }
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Admin/Instructor)
router.post('/', [
  protect,
  authorize('admin', 'instructor'),
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').trim().isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),
  body('instructor').trim().isLength({ min: 2, max: 100 }).withMessage('Instructor name must be between 2 and 100 characters'),
  body('category').isIn(['Programming', 'Data Science', 'Design', 'Business', 'Marketing', 'Photography', 'Music', 'Language', 'Health', 'Science', 'Mathematics', 'Other']),
  body('level').isIn(['Beginner', 'Intermediate', 'Advanced']),
  body('price').optional().isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    const courseData = {
      ...req.body,
      instructorId: req.user.id
    };

    const course = await Course.create(courseData);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Server error while creating course' });
  }
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Admin/Course Instructor)
router.put('/:id', [
  protect,
  authorize('admin', 'instructor'),
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('description').optional().trim().isLength({ min: 20, max: 2000 }),
  body('price').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    let course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user owns the course or is admin
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this course' });
    }

    course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Server error while updating course' });
  }
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Admin/Course Instructor)
router.delete('/:id', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user owns the course or is admin
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this course' });
    }

    // Remove course from all enrolled users
    await User.updateMany(
      { enrolledCourses: course._id },
      { $pull: { enrolledCourses: course._id, completedCourses: course._id } }
    );

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Server error while deleting course' });
  }
});

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course || !course.isPublished) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    if (course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Enroll student in course
    await course.enrollStudent(req.user.id);

    // Add course to user's enrolled courses
    const user = await User.findById(req.user.id);
    await user.enrollInCourse(course._id);

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      course: {
        id: course._id,
        title: course.title,
        instructor: course.instructor
      }
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ error: 'Server error while enrolling in course' });
  }
});

// @desc    Unenroll from course
// @route   DELETE /api/courses/:id/enroll
// @access  Private
router.delete('/:id/enroll', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if enrolled
    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ error: 'Not enrolled in this course' });
    }

    // Unenroll student from course
    await course.unenrollStudent(req.user.id);

    // Remove course from user's enrolled courses
    const user = await User.findById(req.user.id);
    await user.unenrollFromCourse(course._id);

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({ error: 'Server error while unenrolling from course' });
  }
});

// @desc    Get enrolled courses for current user
// @route   GET /api/courses/enrolled
// @access  Private
router.get('/enrolled', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses', '-lessons -reviews');

    res.json({
      success: true,
      count: user.enrolledCourses.length,
      courses: user.enrolledCourses
    });
  } catch (error) {
    console.error('Get enrolled courses error:', error);
    res.status(500).json({ error: 'Server error while fetching enrolled courses' });
  }
});

// @desc    Add review to course
// @route   POST /api/courses/:id/reviews
// @access  Private
router.post('/:id/reviews', [
  protect,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: errors.array().map(err => err.msg).join(', ')
      });
    }

    const { rating, comment } = req.body;
    
    const course = await Course.findById(req.params.id);

    if (!course || !course.isPublished) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is enrolled
    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ error: 'Must be enrolled to review this course' });
    }

    await course.addReview(req.user.id, rating, comment);

    res.json({
      success: true,
      message: 'Review added successfully',
      rating: {
        average: course.rating.average,
        count: course.rating.count
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ error: 'Server error while adding review' });
  }
});

// @desc    Get featured courses
// @route   GET /api/courses/featured
// @access  Public
router.get('/featured', async (req, res) => {
  try {
    const courses = await Course.getFeatured();

    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get featured courses error:', error);
    res.status(500).json({ error: 'Server error while fetching featured courses' });
  }
});

// @desc    Get courses by category
// @route   GET /api/courses/category/:category
// @access  Public
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const courses = await Course.getByCategory(category);

    res.json({
      success: true,
      category,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get courses by category error:', error);
    res.status(500).json({ error: 'Server error while fetching courses by category' });
  }
});

// @desc    Mark course as completed
// @route   POST /api/courses/:id/complete
// @access  Private
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user is enrolled
    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({ error: 'Must be enrolled to complete this course' });
    }

    const user = await User.findById(req.user.id);
    
    // Check if already completed
    if (user.completedCourses.includes(course._id)) {
      return res.status(400).json({ error: 'Course already completed' });
    }

    await user.completeCourse(course._id);

    res.json({
      success: true,
      message: 'Course marked as completed',
      completedAt: new Date()
    });
  } catch (error) {
    console.error('Complete course error:', error);
    res.status(500).json({ error: 'Server error while marking course as completed' });
  }
});

// @desc    Get course statistics (for instructors/admins)
// @route   GET /api/courses/:id/stats
// @access  Private (Admin/Course Instructor)
router.get('/:id/stats', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledStudents', 'name email createdAt');

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if user owns the course or is admin
    if (course.instructorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view course statistics' });
    }

    // Get completion statistics
    const completedCount = await User.countDocuments({
      completedCourses: course._id
    });

    const stats = {
      totalEnrolled: course.enrolledStudents.length,
      totalCompleted: completedCount,
      completionRate: course.enrolledStudents.length > 0 
        ? ((completedCount / course.enrolledStudents.length) * 100).toFixed(2)
        : 0,
      averageRating: course.rating.average,
      totalReviews: course.rating.count,
      revenue: course.price * course.enrolledStudents.length,
      enrolledStudents: course.enrolledStudents
    };

    res.json({
      success: true,
      courseTitle: course.title,
      stats
    });
  } catch (error) {
    console.error('Get course stats error:', error);
    res.status(500).json({ error: 'Server error while fetching course statistics' });
  }
});

module.exports = router;