const router = express.Router();
const identifyController = require('../controllers/identifyController');

router.post('/', identifyController.identify);