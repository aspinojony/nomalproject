const fs = require('fs');

// 读取原始JSON文件
const data = JSON.parse(fs.readFileSync('bilibilicatgorybydifficulty.json', 'utf8'));

// 生成内置数据，每个科目保留前15个章节
const embeddedData = data.map(course => ({
    id: course.id,
    name: course.name,
    desc: course.desc,
    icon: course.icon,
    color: course.color,
    chapters: course.chapters ? course.chapters.slice(0, 99) : []
}));

// 生成JavaScript代码
const jsCode = `getEmbeddedCoursesData() {
    return ${JSON.stringify(embeddedData, null, 8)};
}`;

// 输出结果
console.log('内置数据统计:');
embeddedData.forEach(course => {
    console.log(`${course.name}: ${course.chapters.length} 章节`);
});

console.log('\n生成的JavaScript代码:');
console.log(jsCode);