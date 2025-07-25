// ✅ IndexedDB 学习进度存储模块

const DB_NAME = "StudyProgressDB";
const STORE_NAME = "progress";

// 初始化数据库
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("❌ IndexedDB 打开失败");
  });
}

// 保存进度
async function saveProgressToDB(courseId, chapterIndex, data) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const key = `${courseId}:${chapterIndex}`;
  const record = {
    key,
    courseId,
    chapterIndex,
    ...data,
    lastVisited: new Date().toISOString()
  };

  store.put(record);
  return tx.complete;
}

// 加载某门课程的全部章节进度
async function loadProgressFromDB(courseId) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const progress = {};
      request.result
        .filter(item => item.courseId == courseId)
        .forEach(item => {
          progress[item.chapterIndex] = item;
        });
      resolve(progress);
    };
  });
}

// 合并用户进度到课程结构中
async function mergeProgressIntoCoursesIndexed(courses) {
  for (const course of courses) {
    const progressMap = await loadProgressFromDB(course.id);
    course.chapters = course.chapters.map((chapter, index) => {
      const saved = progressMap[index] || {};
      return {
        ...chapter,
        completed: saved.completed ?? false,
        watchedSeconds: saved.watchedSeconds ?? 0,
        lastVisited: saved.lastVisited ?? null,
        isAutoCompleted: saved.isAutoCompleted ?? false
      };
    });
  }
  return courses;
}

// 加载所有进度数据（用于用户数据管理）
async function loadAllProgressFromDB() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const allProgress = {};
      request.result.forEach(item => {
        allProgress[item.key] = item;
      });
      resolve(allProgress);
    };
    request.onerror = () => resolve({});
  });
}

// 清除所有进度数据（用于用户切换）
async function clearAllProgressFromDB() {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve) => {
    const request = store.clear();
    request.onsuccess = () => {
      console.log('🗑️ 已清除所有进度数据');
      resolve(true);
    };
    request.onerror = () => {
      console.error('❌ 清除进度数据失败');
      resolve(false);
    };
  });
}

// 批量恢复进度数据（用于用户数据恢复）
async function restoreProgressToDB(progressData) {
  if (!progressData || typeof progressData !== 'object') return;

  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const promises = Object.entries(progressData).map(([key, data]) => {
    return new Promise((resolve) => {
      const request = store.put(data);
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error(`❌ 恢复进度数据失败: ${key}`);
        resolve(false);
      };
    });
  });

  await Promise.all(promises);
  console.log('✅ 进度数据已批量恢复');
}