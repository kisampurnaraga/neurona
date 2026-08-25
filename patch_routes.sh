sed -i 's/userDatabase.getUser(/await userDatabase.getUser(/g' server/services/queueService.ts server/routes/videoStudio.ts
sed -i 's/userDatabase.getUserByEmail(/await userDatabase.getUserByEmail(/g' server/services/queueService.ts server/routes/videoStudio.ts
sed -i 's/userDatabase.activateUser(/await userDatabase.activateUser(/g' server/routes/founderPayment.ts
sed -i 's/userDatabase.adjustCredits(/await userDatabase.adjustCredits(/g' server/routes/founderPayment.ts
