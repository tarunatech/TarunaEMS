import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

// @desc    Handle AI chat requests
// @route   POST /api/ai/chat
// @access  Private (Admin)
const chat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a non-empty string'
      });
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // System prompt for EMS context
    const systemPrompt = `You are an AI assistant for an Employee Management System (EMS). You help administrators with HR operations, employee management, leave requests, tasks, departments, attendance, and general questions about the system.

Key features of the EMS:
- Employee management (add, update, view employees)
- Department management
- Leave management and approvals
- Task/project management
- Attendance tracking
- Face recognition for biometric login
- Admin dashboard with statistics
- User roles: Admin and Employee

Always provide helpful, accurate responses. If asked about specific data, remind that you can help with general guidance but actual data queries should be done through the system interface.

Keep responses concise but informative.`;

    // Generate content
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: `User question: ${message}` }
    ]);

    const response = await result.response;
    const aiResponse = response.text();

    res.status(200).json({
      success: true,
      message: aiResponse
    });

  } catch (error) {
    console.error('AI Chat error:', error);

    // Handle specific Gemini API errors
    if (error.message?.includes('API_KEY')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please check API key.'
      });
    }

    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        message: 'AI service temporarily unavailable due to high demand. Please try again later.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'AI service temporarily unavailable. Please try again later.'
    });
  }
};

export { chat };
