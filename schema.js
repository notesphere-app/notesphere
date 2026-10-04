const Joi = require("joi");

// bolgs
module.exports.blogsSchema = Joi.object({
  title: Joi.string().required(),
  id: Joi.string().allow("", null).optional(),
  content: Joi.string().required(),
  category: Joi.string().required(),
  shortdescription: Joi.string().required(),
  image: Joi.string().allow("", null).optional(),
  imageTitle: Joi.string().allow("", null).optional(),
  Keywords: Joi.string().required(),
});
