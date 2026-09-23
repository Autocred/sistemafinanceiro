const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');

try {
  admin.initializeApp();
} catch (e) {}

async function run() {
  try {
    const user = await getAuth().getUserByEmail('joaoggrando@financeai.app');
    console.log("User found:", user.uid);
    await getAuth().updateUser(user.uid, { password: '159357' });
    console.log("Password updated successfully!");
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
