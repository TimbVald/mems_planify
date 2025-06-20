// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getDownloadURL, getStorage, ref, uploadBytesResumable} from "firebase/storage"
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCu-etbk4EHJfhmInMOJd_AS_ZD8PaAHVM",
  authDomain: "mems-planify.firebaseapp.com",
  projectId: "mems-planify",
  storageBucket: "mems-planify.firebasestorage.app",
  messagingSenderId: "35297600397",
  appId: "1:35297600397:web:936464287e8a5440d393c4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app)

export async function uploadFile(file: File, setProgress?: (progress: number) => void) {
    return new Promise((resolve, reject) => {
        try {
            const storageRef = ref(storage, file.name)
            const uploadTask = uploadBytesResumable(storageRef, file)

            uploadTask.on('state_changed', (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                if (setProgress) setProgress(progress)
                switch (snapshot.state) {
                    case 'paused':
                        console.log('Upload is paused');
                        break;
                    case 'running':
                        console.log('Upload is running');
                        break;
                }
            }, (error) => {
                console.error(error)
                reject(error)
            }, () => {
                getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                    resolve(url)
                })
            })
        } catch (error) {
            console.error(error)
            reject(error)
        }
    })
}