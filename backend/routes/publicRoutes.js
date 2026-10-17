const router = require('express').Router();
const c = require('../controllers/publicController');

router.get('/categories', c.listCategories);
router.get('/categories/:id', c.getCategory);
router.get('/tattoos', c.listTattoos);
// Must be registered before "/tattoos/:id" so "number" is not read as an id.
router.get('/tattoos/number/:number', c.getTattooByNumber);
router.get('/tattoos/:id', c.getTattoo);

module.exports = router;
