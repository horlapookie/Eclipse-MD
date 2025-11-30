import axios from 'axios';
import config from '../config.js';

const githubCommand = {
  name: 'github',
  description: 'Get GitHub user information',
  aliases: ['ghuser', 'gituser'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (!args.length) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide a GitHub username.\nUsage: .github username' 
      }, { quoted: msg });
    }

    const username = args[0];
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching GitHub user information...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/users/${username}`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const user = response.data;

      const userInfo = `👨‍💻 *GitHub User Info*

📛 *Name:* ${user.name || 'Not provided'}
🆔 *Username:* ${user.login}
📝 *Bio:* ${user.bio || 'No bio available'}
🏢 *Company:* ${user.company || 'Not specified'}
📍 *Location:* ${user.location || 'Not specified'}
🌐 *Blog:* ${user.blog || 'None'}
📧 *Email:* ${user.email || 'Not public'}
📅 *Joined:* ${new Date(user.created_at).toLocaleDateString()}
👥 *Followers:* ${user.followers}
👤 *Following:* ${user.following}
📚 *Public Repos:* ${user.public_repos}
📋 *Public Gists:* ${user.public_gists}

🔗 *Profile:* ${user.html_url}`;

      await sock.sendMessage(from, { text: userInfo }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { 
        text: '❌ User not found or GitHub API error. Please check the username and try again.' 
      }, { quoted: msg });
    }
  }
};

const gitcommitsCommand = {
  name: 'gitcommits',
  description: 'Get recent commits from a GitHub repository',
  aliases: ['ghcommits', 'commits'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide username and repository name.\nUsage: .gitcommits username repository' 
      }, { quoted: msg });
    }

    const username = args[0];
    const repoName = args[1];
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching recent commits...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}/commits?per_page=5`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const commits = response.data;

      if (!commits.length) {
        return await sock.sendMessage(from, { text: '❌ No commits found in this repository.' }, { quoted: msg });
      }

      let commitsList = `📝 *Recent Commits - ${username}/${repoName}*\n\n`;

      commits.forEach((commit, index) => {
        const message = commit.commit.message.split('\n')[0];
        const author = commit.commit.author.name;
        const date = new Date(commit.commit.author.date).toLocaleDateString();
        const sha = commit.sha.substring(0, 7);

        commitsList += `*${index + 1}. ${message}*\n`;
        commitsList += `👤 ${author} | 📅 ${date} | 🔗 ${sha}\n\n`;
      });

      await sock.sendMessage(from, { text: commitsList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { 
        text: '❌ Repository not found or GitHub API error.' 
      }, { quoted: msg });
    }
  }
};

const gitforksCommand = {
  name: 'gitforks',
  description: 'Get GitHub repository forks',
  aliases: ['ghforks', 'forks'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide username and repository name.\nUsage: .gitforks username repository' 
      }, { quoted: msg });
    }

    const username = args[0];
    const repoName = args[1];
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching repository forks...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}/forks`, {
        params: { sort: 'stargazers', per_page: 5 },
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const forks = response.data;

      if (!forks.length) {
        return await sock.sendMessage(from, { text: '❌ No forks found for this repository.' }, { quoted: msg });
      }

      let forksList = `🍴 *Top Forks - ${username}/${repoName}*\n\n`;

      forks.forEach((fork, index) => {
        const date = new Date(fork.updated_at).toLocaleDateString();
        forksList += `*${index + 1}. ${fork.owner.login}/${fork.name}*\n`;
        forksList += `👤 ${fork.owner.login} | 📅 ${date}\n`;
        forksList += `⭐ ${fork.stargazers_count} | 🍴 ${fork.forks_count}\n`;
        forksList += `🔗 ${fork.html_url}\n\n`;
      });

      await sock.sendMessage(from, { text: forksList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Repository not found or GitHub API error.' }, { quoted: msg });
    }
  }
};

const gitissuesCommand = {
  name: 'gitissues',
  description: 'Get GitHub repository issues',
  aliases: ['ghissues', 'issues'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide username and repository name.\nUsage: .gitissues username repository [state]' 
      }, { quoted: msg });
    }

    const username = args[0];
    const repoName = args[1];
    const state = args[2] || 'open';
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching repository issues...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}/issues`, {
        params: { state, per_page: 5, sort: 'updated' },
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const issues = response.data;

      if (!issues.length) {
        return await sock.sendMessage(from, { text: `❌ No ${state} issues found in this repository.` }, { quoted: msg });
      }

      let issuesList = `🐛 *${state.toUpperCase()} Issues - ${username}/${repoName}*\n\n`;

      issues.forEach((issue, index) => {
        const title = issue.title.length > 60 ? issue.title.substring(0, 60) + '...' : issue.title;
        const labels = issue.labels.map(label => label.name).join(', ');
        const date = new Date(issue.updated_at).toLocaleDateString();

        issuesList += `*${index + 1}. #${issue.number} ${title}*\n`;
        issuesList += `👤 ${issue.user.login} | 📅 ${date}\n`;
        if (labels) issuesList += `🏷️ ${labels}\n`;
        issuesList += `💬 ${issue.comments} comments\n\n`;
      });

      await sock.sendMessage(from, { text: issuesList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Repository not found or GitHub API error.' }, { quoted: msg });
    }
  }
};

const gitpullsCommand = {
  name: 'gitpulls',
  description: 'Get GitHub repository pull requests',
  aliases: ['ghpulls', 'prs'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide username and repository name.\nUsage: .gitpulls username repository [state]' 
      }, { quoted: msg });
    }

    const username = args[0];
    const repoName = args[1];
    const state = args[2] || 'open';
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching pull requests...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}/pulls`, {
        params: { state, per_page: 5, sort: 'updated' },
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const pulls = response.data;

      if (!pulls.length) {
        return await sock.sendMessage(from, { text: `❌ No ${state} pull requests found.` }, { quoted: msg });
      }

      let pullsList = `🔀 *${state.toUpperCase()} Pull Requests - ${username}/${repoName}*\n\n`;

      pulls.forEach((pr, index) => {
        const title = pr.title.length > 60 ? pr.title.substring(0, 60) + '...' : pr.title;
        const date = new Date(pr.updated_at).toLocaleDateString();

        pullsList += `*${index + 1}. #${pr.number} ${title}*\n`;
        pullsList += `👤 ${pr.user.login} | 📅 ${date}\n`;
        pullsList += `🎯 ${pr.base.ref} ← ${pr.head.ref}\n\n`;
      });

      await sock.sendMessage(from, { text: pullsList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Repository not found or GitHub API error.' }, { quoted: msg });
    }
  }
};

const gitreleasesCommand = {
  name: 'gitreleases',
  description: 'Get GitHub repository releases',
  aliases: ['ghreleases', 'releases'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (args.length < 2) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide username and repository name.\nUsage: .gitreleases username repository' 
      }, { quoted: msg });
    }

    const username = args[0];
    const repoName = args[1];
    
    try {
      await sock.sendMessage(from, { text: '🔍 Fetching repository releases...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/repos/${username}/${repoName}/releases?per_page=5`, {
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const releases = response.data;

      if (!releases.length) {
        return await sock.sendMessage(from, { text: '❌ No releases found in this repository.' }, { quoted: msg });
      }

      let releasesList = `🚀 *Releases - ${username}/${repoName}*\n\n`;

      releases.forEach((release, index) => {
        const date = new Date(release.published_at).toLocaleDateString();
        const body = release.body ? (release.body.length > 100 ? release.body.substring(0, 100) + '...' : release.body) : 'No description';

        releasesList += `*${index + 1}. ${release.name || release.tag_name}*\n`;
        releasesList += `🏷️ ${release.tag_name} | 📅 ${date}\n`;
        releasesList += `📦 ${release.assets.length} assets | 📥 ${release.assets.reduce((sum, asset) => sum + asset.download_count, 0)} downloads\n\n`;
      });

      await sock.sendMessage(from, { text: releasesList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Repository not found or GitHub API error.' }, { quoted: msg });
    }
  }
};

const gitsearchCommand = {
  name: 'gitsearch',
  description: 'Search GitHub repositories',
  aliases: ['ghsearch', 'searchrepo'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (!args.length) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide search query.\nUsage: .gitsearch <query>' 
      }, { quoted: msg });
    }

    const query = args.join(' ');
    
    try {
      await sock.sendMessage(from, { text: '🔍 Searching GitHub repositories...' }, { quoted: msg });

      const response = await axios.get(`https://api.github.com/search/repositories`, {
        params: { q: query, sort: 'stars', order: 'desc', per_page: 5 },
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const repos = response.data.items;

      if (!repos.length) {
        return await sock.sendMessage(from, { text: '❌ No repositories found for your search query.' }, { quoted: msg });
      }

      let searchResults = `🔍 *Search Results for "${query}"*\n\n`;

      repos.forEach((repo, index) => {
        const description = repo.description ? (repo.description.length > 80 ? repo.description.substring(0, 80) + '...' : repo.description) : 'No description';

        searchResults += `*${index + 1}. ${repo.name}*\n`;
        searchResults += `👤 ${repo.owner.login}\n`;
        searchResults += `📝 ${description}\n`;
        searchResults += `🏷️ ${repo.language || 'Unknown'} | ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}\n`;
        searchResults += `🔗 ${repo.html_url}\n\n`;
      });

      await sock.sendMessage(from, { text: searchResults }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Failed to search repositories. Please try again later.' }, { quoted: msg });
    }
  }
};

const gitstatsCommand = {
  name: 'gitstats',
  description: 'Get GitHub user statistics',
  aliases: ['ghstats', 'userstats'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    if (!args.length) {
      return await sock.sendMessage(from, { 
        text: '❌ Please provide a GitHub username.\nUsage: .gitstats username' 
      }, { quoted: msg });
    }

    const username = args[0];
    
    try {
      await sock.sendMessage(from, { text: '📊 Fetching GitHub statistics...' }, { quoted: msg });

      const [userResponse, reposResponse] = await Promise.all([
        axios.get(`https://api.github.com/users/${username}`, { timeout: 10000, headers: { 'User-Agent': 'Eclipse-MD-Bot' } }),
        axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { timeout: 10000, headers: { 'User-Agent': 'Eclipse-MD-Bot' } })
      ]);

      const user = userResponse.data;
      const repos = reposResponse.data;

      const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
      const totalForks = repos.reduce((sum, repo) => sum + repo.forks_count, 0);
      const languages = {};
      
      repos.forEach(repo => {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1;
        }
      });

      const topLanguages = Object.entries(languages)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([lang, count]) => `${lang}: ${count}`)
        .join('\n');

      const statsInfo = `📊 *GitHub Statistics for ${username}*

⭐ *Total Stars Earned:* ${totalStars}
🍴 *Total Forks:* ${totalForks}
📚 *Public Repositories:* ${user.public_repos}
👥 *Followers:* ${user.followers}
👤 *Following:* ${user.following}

🔥 *Top Languages:*
${topLanguages || 'No language data'}

📅 *Account Created:* ${new Date(user.created_at).toLocaleDateString()}
🔗 *Profile:* ${user.html_url}`;

      await sock.sendMessage(from, { text: statsInfo }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ User not found or GitHub API error.' }, { quoted: msg });
    }
  }
};

const gittrendingCommand = {
  name: 'gittrending',
  description: 'Get trending GitHub repositories',
  aliases: ['ghtrending', 'trending'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;
    const language = args[0] || '';
    const period = args[1] || 'daily';
    
    try {
      await sock.sendMessage(from, { text: '🔥 Fetching trending repositories...' }, { quoted: msg });

      let dateFilter = '';
      const now = new Date();
      
      if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = `created:>${weekAgo.toISOString().split('T')[0]}`;
      } else if (period === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = `created:>${monthAgo.toISOString().split('T')[0]}`;
      } else {
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFilter = `created:>${dayAgo.toISOString().split('T')[0]}`;
      }

      const languageQuery = language ? `language:${language}` : '';
      const query = [languageQuery, dateFilter].filter(Boolean).join(' ');
      
      const response = await axios.get(`https://api.github.com/search/repositories`, {
        params: { q: query || 'stars:>1', sort: 'stars', order: 'desc', per_page: 5 },
        timeout: 10000,
        headers: { 'User-Agent': 'Eclipse-MD-Bot' }
      });
      const repos = response.data.items;

      if (!repos.length) {
        return await sock.sendMessage(from, { text: '❌ No trending repositories found.' }, { quoted: msg });
      }

      let trendingList = `🔥 *Trending GitHub Repositories*\n${language ? `Language: ${language}` : 'All Languages'} | Period: ${period}\n\n`;

      repos.slice(0, 5).forEach((repo, index) => {
        trendingList += `*${index + 1}. ${repo.name}*\n`;
        trendingList += `👤 ${repo.owner.login}\n`;
        trendingList += `📝 ${repo.description?.substring(0, 100) || 'No description'}${repo.description?.length > 100 ? '...' : ''}\n`;
        trendingList += `🏷️ ${repo.language || 'Unknown'} | ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}\n`;
        trendingList += `🔗 ${repo.html_url}\n\n`;
      });

      await sock.sendMessage(from, { text: trendingList }, { quoted: msg });
    } catch (error) {
      console.error('GitHub API error:', error);
      await sock.sendMessage(from, { text: '❌ Failed to fetch trending repositories.' }, { quoted: msg });
    }
  }
};

const gitrepoCommand = {
  name: 'gitrepo',
  description: 'Download GitHub repository as zip file',
  aliases: ['repo', 'download-repo', 'git-download'],
  async execute(msg, { sock, args }) {
    const from = msg.key.remoteJid;

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `*📦 GitHub Repository Downloader*\n\nUsage: .gitrepo <github-url>\n\nExample:\n.gitrepo https://github.com/horlapookie/Horlapookie-bot\n\n*Bot:* ${config.botName}\n*Note:* Supports public repositories only.`
      }, { quoted: msg });
    }

    let repoUrl = args[0];

    if (repoUrl.toLowerCase() === 'this' || repoUrl.toLowerCase() === 'horlapookie') {
      repoUrl = 'https://github.com/horlapookie/Eclise-MD';
    }

    const githubRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/.*)?$/;
    const match = repoUrl.match(githubRegex);

    if (!match) {
      return await sock.sendMessage(from, {
        text: '❌ Invalid GitHub URL. Please provide a valid GitHub repository URL.\n\nExample: https://github.com/username/repository'
      }, { quoted: msg });
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    try {
      await sock.sendMessage(from, {
        text: `⏳ Downloading repository: ${owner}/${cleanRepo}\nPlease wait...`
      }, { quoted: msg });

      const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
      const repoResponse = await fetch(apiUrl);

      if (!repoResponse.ok) {
        if (repoResponse.status === 404) {
          return await sock.sendMessage(from, {
            text: '❌ Repository not found. Please check if the repository exists and is public.'
          }, { quoted: msg });
        }
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }

      const repoData = await repoResponse.json();
      const downloadUrl = `https://github.com/${owner}/${cleanRepo}/archive/refs/heads/${repoData.default_branch || 'main'}.zip`;
      const zipResponse = await fetch(downloadUrl);

      if (!zipResponse.ok) {
        throw new Error(`Download failed: ${zipResponse.status}`);
      }

      const buffer = await zipResponse.arrayBuffer();
      const zipBuffer = Buffer.from(buffer);

      await sock.sendMessage(from, {
        document: zipBuffer,
        mimetype: 'application/zip',
        fileName: `${cleanRepo}-${repoData.default_branch || 'main'}.zip`,
        caption: `📦 *${repoData.name}*\n\n📝 Description: ${repoData.description || 'No description'}\n👨‍💻 Owner: ${repoData.owner.login}\n⭐ Stars: ${repoData.stargazers_count}\n🍴 Forks: ${repoData.forks_count}\n📅 Updated: ${new Date(repoData.updated_at).toLocaleDateString()}\n🌐 Language: ${repoData.language || 'Not specified'}\n\n🔗 Repository: ${repoData.html_url}`
      }, { quoted: msg });
    } catch (error) {
      console.error('GitHub download error:', error);
      await sock.sendMessage(from, { text: '❌ Failed to download repository.' }, { quoted: msg });
    }
  }
};

export default [
  githubCommand,
  gitcommitsCommand,
  gitforksCommand,
  gitissuesCommand,
  gitpullsCommand,
  gitreleasesCommand,
  gitsearchCommand,
  gitstatsCommand,
  gittrendingCommand,
  gitrepoCommand
];
