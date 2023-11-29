// MARK: Setup
const express = require('express');
const router = express.Router();
const fs = require('fs');
const historyJsonPath = 'generationHistory.json';


// MARK: Get Generation History For a Specific User
router.get('/account/history/:userId', async (req, res) => {
    const userId = req.params.userId;
    try{
        const historyJson = await fs.promises.readFile(historyJsonPath, 'utf-8');
        const parsedHistory = JSON.parse(historyJson);
        const userSpecificHistory = parsedHistory[userId];
        console.log('Successfully returned user history data for: ', userId);
        res.status(200).json(userSpecificHistory);
    }catch(error){
        console.log('Failed to retrieve specific user history data: ', userId, ': ', error);
        res.status(500).json({error});
    }
});


module.exports = router;