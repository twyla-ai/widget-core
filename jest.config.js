module.exports = {
  moduleFileExtensions: ['js'],
  moduleDirectories: ['node_modules'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  globals: {
    window: {
      location: {
        origin: 'https://jest-test.com',
        pathname: '/widget.html',
      },
    },
  },
};
