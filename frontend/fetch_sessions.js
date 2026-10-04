import { readFileSync } from 'fs';
import http from 'http';

http.get('http://localhost:5144/api/Sessions', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
}).on('error', (err) => {
  console.error(err);
});
