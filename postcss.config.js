export default {
    plugins: {
        'postcss-import': {},
        'postcss-nesting': {},
        autoprefixer: {},
        ...(process.env.NODE_ENV === 'production'
            ? {
                  cssnano: {
                      preset: [
                          'default',
                          {
                              discardComments: { removeAll: true },
                          },
                      ],
                  },
              }
            : {}),
    },
};
