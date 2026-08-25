sed -i 's/user.credits = Math.max(0, currentCredits - REQUIRED_CREDITS_PER_RENDER);/user.credits = Math.max(0, currentCredits - REQUIRED_CREDITS_PER_RENDER);/g' server/routes/videoStudio.ts
sed -i 's/const dbUser = await userDatabase.getUser(user.user_id) || await userDatabase.getUserByEmail(user.email);/await userDatabase.adjustCredits(user.user_id, -REQUIRED_CREDITS_PER_RENDER, true);/g' server/routes/videoStudio.ts
sed -i 's/if (dbUser) dbUser.credits = user.credits;/\/\/ Handled by adjustCredits/g' server/routes/videoStudio.ts
