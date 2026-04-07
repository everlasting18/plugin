const { registerPlugin } = wp.plugins;

import App from './App.jsx';

registerPlugin('contentai', {
  render: () => <App />,
});
