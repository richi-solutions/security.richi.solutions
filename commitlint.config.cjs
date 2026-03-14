// Commitlint configuration
// Distributed via .claude/sync/ to all richi-solutions projects

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Dependabot and other bots generate long lines in body/footer
    'body-max-line-length': [0, 'always'],
    'footer-max-line-length': [0, 'always'],
  },
};
