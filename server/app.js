const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

const users = [
    {
        name: "victor",
        password: "test"
    }
];

const secretKey = 'yourSecretKey';

app.use(express.json());

app.get('/', (req, res) => {
    res.send('hello world ! ');
});

app.post('/auth', (req, res) => {
    const { name, password } = req.body;

    const valid = users.some((user) => user.name === name && user.password === password);

    if (valid) {
        const token = jwt.sign({ name }, secretKey, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Authentication failed' });
    }
});

app.listen(port, () => {
    console.log('App listening at http://localhost:' + port);
});
