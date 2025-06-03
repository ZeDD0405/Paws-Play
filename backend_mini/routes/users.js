
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, msg: 'Invalid credentials' });
      }
  
      res.status(200).json({
        success: true,
        user: {
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  });
  
  module.exports = router;
  
  
  
  router.post('/login', async (req, res) => {
      const { email, password } = req.body;
    
      try {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
          return res.status(401).json({ success: false, msg: 'Invalid credentials' });
        }
    
        res.status(200).json({
          success: true,
          user: {
            username: user.username,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ success: false, msg: 'Server error' });
      }
    });
    
    module.exports = router;