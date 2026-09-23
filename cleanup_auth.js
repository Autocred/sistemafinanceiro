const API_KEY = "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U";

async function deleteOrphanUser(email, password) {
  try {
    // 1. Log in
    const signInRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const signInData = await signInRes.json();
    
    if (!signInRes.ok) {
      console.log(`Failed to log in ${email}:`, signInData.error.message);
      return;
    }
    
    // 2. Delete user
    const deleteRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: signInData.idToken })
    });
    
    if (!deleteRes.ok) {
      const deleteData = await deleteRes.json();
      console.log(`Failed to delete ${email}:`, deleteData.error.message);
    } else {
      console.log(`Successfully deleted ${email} from Firebase Auth.`);
    }
  } catch(e) {
    console.error(e);
  }
}

async function run() {
  await deleteOrphanUser('joaofelipe@financeai.app', '10203040');
  await deleteOrphanUser('joãofelipe@financeai.app', '10203040');
}
run();
