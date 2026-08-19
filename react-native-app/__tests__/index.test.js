import fs from 'fs';
import path from 'path';

describe('React Native App Entry Point', () => {
  it('initializes react-native-gesture-handler before registering the app', () => {
    const entryPath = path.join(__dirname, '../index.js');
    const entrySource = fs.readFileSync(entryPath, 'utf8');
    expect(entrySource).toContain("import 'react-native-gesture-handler';");
  });
});
