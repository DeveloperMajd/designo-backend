export default {
  routes: [
    {
      method: "POST",
      path: "/contact-form/send",
      handler: "contact-form.send",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
