sed -i 's/const user = await userDatabase.getUser(userId) || await userDatabase.getUserByEmail(userId);/await userDatabase.adjustCredits(userId, -credits, true);\n      const user = await userDatabase.getUser(userId);/g' server/services/queueService.ts
sed -i 's/user.credits = Math.max(0, user.credits - credits);/\/\/ Handled by adjustCredits/g' server/services/queueService.ts
