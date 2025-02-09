const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
import identifyRoutes from './routes/identifyRoutes';
app.use(express.json());

app.use('/identify', identifyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});