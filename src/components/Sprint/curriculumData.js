/**
 * Curriculum Metadata Manifest
 * Swapping this manifest + INITIAL_CURRICULUM is all that's required to reconfigure the entire tracker!
 */
export const CURRICULUM_META = {
  id: 'alphabet-sprint-2026',
  badge: '40',
  brandName: 'Alphabet Sprint OS',
  track: 'L4/L5 Backend Track',
  defaultStartDate: '2026-11-17',
  tagline: 'NOV 17, 2026 → DEC 26, 2026 • RIGOROUS EXECUTION WORKSPACE',
  title: '40-Day Alphabet Sprint: DSA & System Design Tracker',
  description: 'Pattern-first Blind 75 execution + 40 days of distributed systems deep dives. Click any day to open your engineering journal & complexity log.',
  targetDate: '2026-12-26T23:59:59',
  storageKey: 'alphabet_40day_sprint_v1'
};

/**
 * Calculate dynamic sprint day date based on user's chosen start date (Timezone-safe)
 */
export const calculateSprintDayDate = (startDateStr, dayNumber) => {
  let year, month, day;
  if (typeof startDateStr === 'string' && startDateStr.includes('-')) {
    const parts = startDateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1; // 0-indexed month
    day = parts[2];
  } else {
    const d = new Date(startDateStr || '2026-11-17');
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  const targetDate = new Date(year, month, day + (dayNumber - 1));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    date: `${months[targetDate.getMonth()]} ${targetDate.getDate()}, ${targetDate.getFullYear()}`,
    weekday: weekdays[targetDate.getDay()],
    fullDate: targetDate,
    isoDate: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`
  };
};

/**
 * Complete Curriculum Dataset
 */
export const INITIAL_CURRICULUM = [
  // ==================== PHASE 1: LINEAR DATA STRUCTURES & CORE STORAGE (DAYS 1-10) ====================
  {
    day: 1,
    date: "Nov 17, 2026",
    weekday: "Tue",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Arrays & Hashing",
    dsa: [
      { id: "dsa-1-1", title: "Two Sum", difficulty: "Easy", leetcode: 1 },
      { id: "dsa-1-2", title: "Contains Duplicate", difficulty: "Easy", leetcode: 217 }
    ],
    systemDesign: {
      id: "sd-1",
      title: "Database Indexing Internals: B-Trees vs. LSM Trees",
      category: "Storage Internals",
      focus: "Write amplification vs. read amplification, SSTables, WAL, compaction strategies."
    }
  },
  {
    day: 2,
    date: "Nov 18, 2026",
    weekday: "Wed",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Arrays & Hashing",
    dsa: [
      { id: "dsa-2-1", title: "Valid Anagram", difficulty: "Easy", leetcode: 242 },
      { id: "dsa-2-2", title: "Group Anagrams", difficulty: "Medium", leetcode: 49 }
    ],
    systemDesign: {
      id: "sd-2",
      title: "Replication & Sharding Strategies",
      category: "Distributed Data",
      focus: "Leader-follower vs. multi-leader, consistent hashing rings, hot-key mitigation."
    }
  },
  {
    day: 3,
    date: "Nov 19, 2026",
    weekday: "Thu",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Arrays & Hashing",
    dsa: [
      { id: "dsa-3-1", title: "Top K Frequent Elements", difficulty: "Medium", leetcode: 347 },
      { id: "dsa-3-2", title: "Product of Array Except Self", difficulty: "Medium", leetcode: 238 }
    ],
    systemDesign: {
      id: "sd-3",
      title: "Architecture: Design a URL Shortener (TinyURL)",
      category: "Core Architecture",
      focus: "Base62 encoding vs. KGS (Key Generation Service), 301 vs. 302 redirects, read-heavy Redis layer."
    }
  },
  {
    day: 4,
    date: "Nov 20, 2026",
    weekday: "Fri",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Arrays & Two Pointers",
    dsa: [
      { id: "dsa-4-1", title: "Encode and Decode Strings", difficulty: "Medium", leetcode: 271 },
      { id: "dsa-4-2", title: "Longest Consecutive Sequence", difficulty: "Medium", leetcode: 128 }
    ],
    systemDesign: {
      id: "sd-4",
      title: "Caching Patterns & Eviction Policies",
      category: "Performance",
      focus: "Cache-aside, write-through, write-behind, thundering herd / cache stampede prevention."
    }
  },
  {
    day: 5,
    date: "Nov 21, 2026",
    weekday: "Sat",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Two Pointers",
    dsa: [
      { id: "dsa-5-1", title: "Valid Palindrome", difficulty: "Easy", leetcode: 125 },
      { id: "dsa-5-2", title: "3Sum", difficulty: "Medium", leetcode: 15 }
    ],
    systemDesign: {
      id: "sd-5",
      title: "Redis Internals & Distributed Caching Clusters",
      category: "Performance",
      focus: "Single-threaded event loop, Redis Cluster slot hashing (16384 slots), RDB vs. AOF."
    }
  },
  {
    day: 6,
    date: "Nov 22, 2026",
    weekday: "Sun",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Two Pointers & Sliding Window (Sunday Review)",
    dsa: [
      { id: "dsa-6-1", title: "Container With Most Water", difficulty: "Medium", leetcode: 11 },
      { id: "dsa-6-2", title: "Best Time to Buy and Sell Stock", difficulty: "Easy", leetcode: 121 }
    ],
    systemDesign: {
      id: "sd-6",
      title: "Architecture: Design a Distributed Rate Limiter",
      category: "Core Architecture",
      focus: "Token Bucket vs. Sliding Window Log, Lua scripts in Redis for atomicity, race conditions."
    }
  },
  {
    day: 7,
    date: "Nov 23, 2026",
    weekday: "Mon",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Sliding Window",
    dsa: [
      { id: "dsa-7-1", title: "Longest Substring Without Repeating Characters", difficulty: "Medium", leetcode: 3 },
      { id: "dsa-7-2", title: "Longest Repeating Character Replacement", difficulty: "Medium", leetcode: 424 }
    ],
    systemDesign: {
      id: "sd-7",
      title: "Load Balancing (L4 vs L7) & API Gateways",
      category: "Networking",
      focus: "Consistent hashing, least connections, TLS termination, circuit breakers."
    }
  },
  {
    day: 8,
    date: "Nov 24, 2026",
    weekday: "Tue",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Sliding Window & Stack",
    dsa: [
      { id: "dsa-8-1", title: "Minimum Window Substring", difficulty: "Hard", leetcode: 76 },
      { id: "dsa-8-2", title: "Valid Parentheses", difficulty: "Easy", leetcode: 20 }
    ],
    systemDesign: {
      id: "sd-8",
      title: "CAP & PACELC Theorems in Real-World Databases",
      category: "Distributed Theory",
      focus: "Tunable consistency (R + W > N), split-brain scenarios, latency vs. consistency trade-offs."
    }
  },
  {
    day: 9,
    date: "Nov 25, 2026",
    weekday: "Wed",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Binary Search & Linked Lists",
    dsa: [
      { id: "dsa-9-1", title: "Find Minimum in Rotated Sorted Array", difficulty: "Medium", leetcode: 153 },
      { id: "dsa-9-2", title: "Search in Rotated Sorted Array", difficulty: "Medium", leetcode: 33 }
    ],
    systemDesign: {
      id: "sd-9",
      title: "Architecture: Distributed Key-Value Store (Part 1 - Partitioning)",
      category: "Core Architecture",
      focus: "Dynamo architecture, virtual nodes, sloppy quorums, hinted handoff."
    }
  },
  {
    day: 10,
    date: "Nov 26, 2026",
    weekday: "Thu",
    phase: 1,
    phaseTitle: "Linear & Core Storage",
    pattern: "Linked Lists",
    dsa: [
      { id: "dsa-10-1", title: "Reverse Linked List", difficulty: "Easy", leetcode: 206 },
      { id: "dsa-10-2", title: "Merge Two Sorted Lists", difficulty: "Easy", leetcode: 21 }
    ],
    systemDesign: {
      id: "sd-10",
      title: "Architecture: Distributed Key-Value Store (Part 2 - Versioning)",
      category: "Core Architecture",
      focus: "Vector clocks, Merkle trees for anti-entropy repair, gossip failure detection."
    }
  },

  // ==================== PHASE 2: TREES, HEAPS & ASYNC SYSTEMS (DAYS 11-20) ====================
  {
    day: 11,
    date: "Nov 27, 2026",
    weekday: "Fri",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Linked Lists",
    dsa: [
      { id: "dsa-11-1", title: "Reorder List", difficulty: "Medium", leetcode: 143 },
      { id: "dsa-11-2", title: "Remove Nth Node From End of List", difficulty: "Medium", leetcode: 19 }
    ],
    systemDesign: {
      id: "sd-11",
      title: "Message Queues & Kafka Architecture Internals",
      category: "Async Systems",
      focus: "Zero-copy sendfile, partition offsets, consumer group rebalancing, ISR (In-Sync Replicas)."
    }
  },
  {
    day: 12,
    date: "Nov 28, 2026",
    weekday: "Sat",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Linked Lists & Trees",
    dsa: [
      { id: "dsa-12-1", title: "Linked List Cycle", difficulty: "Easy", leetcode: 141 },
      { id: "dsa-12-2", title: "Invert Binary Tree", difficulty: "Easy", leetcode: 226 }
    ],
    systemDesign: {
      id: "sd-12",
      title: "Delivery Semantics & Idempotency",
      category: "Async Systems",
      focus: "At-least-once vs. exactly-once processing, idempotency keys, transactional outbox pattern."
    }
  },
  {
    day: 13,
    date: "Nov 29, 2026",
    weekday: "Sun",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Binary Trees DFS (Sunday Review)",
    dsa: [
      { id: "dsa-13-1", title: "Maximum Depth of Binary Tree", difficulty: "Easy", leetcode: 104 },
      { id: "dsa-13-2", title: "Same Tree", difficulty: "Easy", leetcode: 100 }
    ],
    systemDesign: {
      id: "sd-13",
      title: "Architecture: Scalable Notification System (Part 1)",
      category: "Core Architecture",
      focus: "APNs/FCM/SMS gateways, priority queues, user preference caching, rate limiting."
    }
  },
  {
    day: 14,
    date: "Nov 30, 2026",
    weekday: "Mon",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Binary Trees & BST",
    dsa: [
      { id: "dsa-14-1", title: "Subtree of Another Tree", difficulty: "Easy", leetcode: 572 },
      { id: "dsa-14-2", title: "Lowest Common Ancestor of a BST", difficulty: "Medium", leetcode: 235 }
    ],
    systemDesign: {
      id: "sd-14",
      title: "Architecture: Scalable Notification System (Part 2)",
      category: "Core Architecture",
      focus: "Exponential backoff retries, Dead Letter Queues (DLQ), deduplication & analytics tracking."
    }
  },
  {
    day: 15,
    date: "Dec 01, 2026",
    weekday: "Tue",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Binary Trees BFS & Validation",
    dsa: [
      { id: "dsa-15-1", title: "Binary Tree Level Order Traversal", difficulty: "Medium", leetcode: 102 },
      { id: "dsa-15-2", title: "Validate Binary Search Tree", difficulty: "Medium", leetcode: 98 }
    ],
    systemDesign: {
      id: "sd-15",
      title: "Real-Time Protocols: WebSockets, SSE, Long Polling",
      category: "Networking",
      focus: "Stateful connection management, sticky sessions vs. pub/sub backplanes, heartbeat pings."
    }
  },
  {
    day: 16,
    date: "Dec 02, 2026",
    weekday: "Wed",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Binary Trees Construction",
    dsa: [
      { id: "dsa-16-1", title: "Kth Smallest Element in a BST", difficulty: "Medium", leetcode: 230 },
      { id: "dsa-16-2", title: "Construct Binary Tree from Preorder and Inorder", difficulty: "Medium", leetcode: 105 }
    ],
    systemDesign: {
      id: "sd-16",
      title: "Architecture: Real-Time Chat System (WhatsApp / Messenger)",
      category: "Core Architecture",
      focus: "Chat service gateway, Snowflake ID ordering, HBase/Cassandra wide-column message storage."
    }
  },
  {
    day: 17,
    date: "Dec 03, 2026",
    weekday: "Thu",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Hard Binary Trees",
    dsa: [
      { id: "dsa-17-1", title: "Binary Tree Maximum Path Sum", difficulty: "Hard", leetcode: 124 },
      { id: "dsa-17-2", title: "Serialize and Deserialize Binary Tree", difficulty: "Hard", leetcode: 297 }
    ],
    systemDesign: {
      id: "sd-17",
      title: "Chat System Deep Dive: Group Chats & Online Presence",
      category: "Core Architecture",
      focus: "Message sync queues per device, group fan-out limits, presence heartbeat cascading."
    }
  },
  {
    day: 18,
    date: "Dec 04, 2026",
    weekday: "Fri",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Tries (Prefix Trees)",
    dsa: [
      { id: "dsa-18-1", title: "Implement Trie (Prefix Tree)", difficulty: "Medium", leetcode: 208 },
      { id: "dsa-18-2", title: "Design Add and Search Words Data Structure", difficulty: "Medium", leetcode: 211 }
    ],
    systemDesign: {
      id: "sd-18",
      title: "Architecture: News Feed / Timeline (Part 1 - Fan-out)",
      category: "Core Architecture",
      focus: "Fan-out on write (push) vs. fan-out on read (pull), celebrity hot-key problem."
    }
  },
  {
    day: 19,
    date: "Dec 05, 2026",
    weekday: "Sat",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Tries & Heaps",
    dsa: [
      { id: "dsa-19-1", title: "Word Search II", difficulty: "Hard", leetcode: 212 },
      { id: "dsa-19-2", title: "Merge K Sorted Lists", difficulty: "Hard", leetcode: 23 }
    ],
    systemDesign: {
      id: "sd-19",
      title: "Architecture: News Feed (Part 2 - Hybrid Ranking & Media)",
      category: "Core Architecture",
      focus: "Hybrid feed generation, Redis feed cache sizing, cursor-based pagination."
    }
  },
  {
    day: 20,
    date: "Dec 06, 2026",
    weekday: "Sun",
    phase: 2,
    phaseTitle: "Trees, Heaps & Async",
    pattern: "Heaps & Backtracking (Sunday Review)",
    dsa: [
      { id: "dsa-20-1", title: "Find Median from Data Stream", difficulty: "Hard", leetcode: 295 },
      { id: "dsa-20-2", title: "Combination Sum", difficulty: "Medium", leetcode: 39 }
    ],
    systemDesign: {
      id: "sd-20",
      title: "System Design Mock #1: Design Twitter/X Timeline",
      category: "Timed Mock",
      focus: "45-min solo whiteboard drill: QPS math, schema design, fan-out bottleneck resolution."
    }
  },

  // ==================== PHASE 3: GRAPHS, BACKTRACKING & HIGH-SCALE SYSTEMS (DAYS 21-30) ====================
  {
    day: 21,
    date: "Dec 07, 2026",
    weekday: "Mon",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Backtracking & Grid Graphs",
    dsa: [
      { id: "dsa-21-1", title: "Word Search", difficulty: "Medium", leetcode: 79 },
      { id: "dsa-21-2", title: "Number of Islands", difficulty: "Medium", leetcode: 200 }
    ],
    systemDesign: {
      id: "sd-21",
      title: "Distributed Consensus: Raft & Paxos Fundamentals",
      category: "Distributed Theory",
      focus: "Leader election, log replication, split votes, quorum safety guarantees."
    }
  },
  {
    day: 22,
    date: "Dec 08, 2026",
    weekday: "Tue",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Graph Traversal (BFS/DFS)",
    dsa: [
      { id: "dsa-22-1", title: "Clone Graph", difficulty: "Medium", leetcode: 133 },
      { id: "dsa-22-2", title: "Pacific Atlantic Water Flow", difficulty: "Medium", leetcode: 417 }
    ],
    systemDesign: {
      id: "sd-22",
      title: "Distributed Locks & Saga Orchestration",
      category: "Distributed Theory",
      focus: "Redlock vs. ZooKeeper/etcd fencing tokens, choreography vs. orchestration sagas."
    }
  },
  {
    day: 23,
    date: "Dec 09, 2026",
    weekday: "Wed",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Topological Sort & Union-Find",
    dsa: [
      { id: "dsa-23-1", title: "Course Schedule", difficulty: "Medium", leetcode: 207 },
      { id: "dsa-23-2", title: "Number of Connected Components in Undirected Graph", difficulty: "Medium", leetcode: 323 }
    ],
    systemDesign: {
      id: "sd-23",
      title: "Architecture: Distributed Web Crawler (Part 1)",
      category: "Core Architecture",
      focus: "URL Frontier (priority + politeness queues), DNS resolver caching, HTML parser workers."
    }
  },
  {
    day: 24,
    date: "Dec 10, 2026",
    weekday: "Thu",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Graph Validation & Alien Order",
    dsa: [
      { id: "dsa-24-1", title: "Graph Valid Tree", difficulty: "Medium", leetcode: 261 },
      { id: "dsa-24-2", title: "Alien Dictionary", difficulty: "Hard", leetcode: 269 }
    ],
    systemDesign: {
      id: "sd-24",
      title: "Architecture: Distributed Web Crawler (Part 2 - Deduplication)",
      category: "Core Architecture",
      focus: "Bloom filters for seen URLs, SimHash / MinHash for near-duplicate content detection, spider traps."
    }
  },
  {
    day: 25,
    date: "Dec 11, 2026",
    weekday: "Fri",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Intervals",
    dsa: [
      { id: "dsa-25-1", title: "Insert Interval", difficulty: "Medium", leetcode: 57 },
      { id: "dsa-25-2", title: "Merge Intervals", difficulty: "Medium", leetcode: 56 }
    ],
    systemDesign: {
      id: "sd-25",
      title: "Architecture: Cloud File Storage (Google Drive / Dropbox) - Part 1",
      category: "Core Architecture",
      focus: "File chunking (4MB blocks), content-addressable storage (SHA-256), deduplication."
    }
  },
  {
    day: 26,
    date: "Dec 12, 2026",
    weekday: "Sat",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Intervals & Sweep Line",
    dsa: [
      { id: "dsa-26-1", title: "Non-overlapping Intervals", difficulty: "Medium", leetcode: 435 },
      { id: "dsa-26-2", title: "Meeting Rooms", difficulty: "Easy", leetcode: 252 },
      { id: "dsa-26-3", title: "Meeting Rooms II", difficulty: "Medium", leetcode: 253 }
    ],
    systemDesign: {
      id: "sd-26",
      title: "Architecture: Cloud File Storage (Part 2 - Delta Sync & Metadata)",
      category: "Core Architecture",
      focus: "Delta sync notifications, ACID metadata DB for file hierarchy, cold storage tiering."
    }
  },
  {
    day: 27,
    date: "Dec 13, 2026",
    weekday: "Sun",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Matrix Manipulation (Sunday Review)",
    dsa: [
      { id: "dsa-27-1", title: "Rotate Image", difficulty: "Medium", leetcode: 48 },
      { id: "dsa-27-2", title: "Spiral Matrix", difficulty: "Medium", leetcode: 54 }
    ],
    systemDesign: {
      id: "sd-27",
      title: "System Design Mock #2: Design Google Drive",
      category: "Timed Mock",
      focus: "45-min solo whiteboard drill: upload/download flow, conflict resolution, offline sync."
    }
  },
  {
    day: 28,
    date: "Dec 14, 2026",
    weekday: "Mon",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Matrix & Greedy",
    dsa: [
      { id: "dsa-28-1", title: "Set Matrix Zeroes", difficulty: "Medium", leetcode: 73 },
      { id: "dsa-28-2", title: "Maximum Subarray", difficulty: "Medium", leetcode: 53 }
    ],
    systemDesign: {
      id: "sd-28",
      title: "Architecture: Video Streaming Platform (YouTube) - Part 1",
      category: "Core Architecture",
      focus: "Blob upload presigned URLs, DAG transcoding pipeline, HLS/DASH adaptive bitrate."
    }
  },
  {
    day: 29,
    date: "Dec 15, 2026",
    weekday: "Tue",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Greedy & Bit Manipulation",
    dsa: [
      { id: "dsa-29-1", title: "Jump Game", difficulty: "Medium", leetcode: 55 },
      { id: "dsa-29-2", title: "Number of 1 Bits", difficulty: "Easy", leetcode: 191 }
    ],
    systemDesign: {
      id: "sd-29",
      title: "Architecture: Video Streaming Platform (Part 2 - CDN & Edge)",
      category: "Core Architecture",
      focus: "CDN push vs. pull strategies, ISP edge caching, cost optimization for long-tail videos."
    }
  },
  {
    day: 30,
    date: "Dec 16, 2026",
    weekday: "Wed",
    phase: 3,
    phaseTitle: "Graphs & High-Scale",
    pattern: "Bit Manipulation Mastery",
    dsa: [
      { id: "dsa-30-1", title: "Counting Bits", difficulty: "Easy", leetcode: 338 },
      { id: "dsa-30-2", title: "Reverse Bits", difficulty: "Easy", leetcode: 190 },
      { id: "dsa-30-3", title: "Missing Number", difficulty: "Easy", leetcode: 268 },
      { id: "dsa-30-4", title: "Sum of Two Integers", difficulty: "Medium", leetcode: 371 }
    ],
    systemDesign: {
      id: "sd-30",
      title: "CDN Internals, Anycast DNS & Edge Compute",
      category: "Networking",
      focus: "BGP Anycast routing, cache invalidation strategies, geo-routing."
    }
  },

  // ==================== PHASE 4: DYNAMIC PROGRAMMING & ALPHABET MOCKS (DAYS 31-40) ====================
  {
    day: 31,
    date: "Dec 17, 2026",
    weekday: "Thu",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "1D Dynamic Programming",
    dsa: [
      { id: "dsa-31-1", title: "Climbing Stairs", difficulty: "Easy", leetcode: 70 },
      { id: "dsa-31-2", title: "House Robber", difficulty: "Medium", leetcode: 198 }
    ],
    systemDesign: {
      id: "sd-31",
      title: "Architecture: Typeahead / Search Autocomplete",
      category: "Core Architecture",
      focus: "Distributed Trie partitioning, top-K precomputation at nodes, MapReduce log aggregation."
    }
  },
  {
    day: 32,
    date: "Dec 18, 2026",
    weekday: "Fri",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "1D Dynamic Programming",
    dsa: [
      { id: "dsa-32-1", title: "House Robber II", difficulty: "Medium", leetcode: 213 },
      { id: "dsa-32-2", title: "Longest Palindromic Substring", difficulty: "Medium", leetcode: 5 }
    ],
    systemDesign: {
      id: "sd-32",
      title: "Search Engine Indexing & Inverted Index Basics",
      category: "Search & Data",
      focus: "Term partitioning vs. document partitioning, TF-IDF / BM25 scoring, distributed scatter-gather."
    }
  },
  {
    day: 33,
    date: "Dec 19, 2026",
    weekday: "Sat",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "1D DP & Palindromes",
    dsa: [
      { id: "dsa-33-1", title: "Palindromic Substrings", difficulty: "Medium", leetcode: 647 },
      { id: "dsa-33-2", title: "Decode Ways", difficulty: "Medium", leetcode: 91 }
    ],
    systemDesign: {
      id: "sd-33",
      title: "Architecture: Proximity Service / Google Maps Places",
      category: "Core Architecture",
      focus: "Geohashing vs. Quadtrees vs. Google S2 geometry, read-heavy spatial index caching."
    }
  },
  {
    day: 34,
    date: "Dec 20, 2026",
    weekday: "Sun",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "1D DP Unbounded Knapsack (Sunday Review)",
    dsa: [
      { id: "dsa-34-1", title: "Coin Change", difficulty: "Medium", leetcode: 322 },
      { id: "dsa-34-2", title: "Maximum Product Subarray", difficulty: "Medium", leetcode: 152 }
    ],
    systemDesign: {
      id: "sd-34",
      title: "Architecture: Ride-Matching & High-Frequency Location Updates (Uber)",
      category: "Core Architecture",
      focus: "Write-heavy driver location ingestion (Kafka + Redis Geo), dispatch matching & surge pricing."
    }
  },
  {
    day: 35,
    date: "Dec 21, 2026",
    weekday: "Mon",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "1D DP Subsequences",
    dsa: [
      { id: "dsa-35-1", title: "Word Break", difficulty: "Medium", leetcode: 139 },
      { id: "dsa-35-2", title: "Longest Increasing Subsequence", difficulty: "Medium", leetcode: 300 }
    ],
    systemDesign: {
      id: "sd-35",
      title: "Architecture: Payment System & Distributed Ledger",
      category: "Core Architecture",
      focus: "Double-entry bookkeeping, ACID guarantees, PSP integration, reconciliation pipelines."
    }
  },
  {
    day: 36,
    date: "Dec 22, 2026",
    weekday: "Tue",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "2D Dynamic Programming",
    dsa: [
      { id: "dsa-36-1", title: "Unique Paths", difficulty: "Medium", leetcode: 62 },
      { id: "dsa-36-2", title: "Longest Common Subsequence", difficulty: "Medium", leetcode: 1143 }
    ],
    systemDesign: {
      id: "sd-36",
      title: "Distributed Metrics, Logging & Tracing (Observability)",
      category: "Infrastructure",
      focus: "Time-series DBs (Gorilla compression), pull vs. push metrics, tail-based trace sampling."
    }
  },
  {
    day: 37,
    date: "Dec 23, 2026",
    weekday: "Wed",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "2D DP & Combinations",
    dsa: [
      { id: "dsa-37-1", title: "Combination Sum IV", difficulty: "Medium", leetcode: 377 }
    ],
    systemDesign: {
      id: "sd-37",
      title: "Google Spanner & TrueTime Concepts (Alphabet Bonus)",
      category: "Google Deep Dive",
      focus: "External consistency, atomic clocks + GPS bounds, Paxos groups across shards."
    }
  },
  {
    day: 38,
    date: "Dec 24, 2026",
    weekday: "Thu",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "Alphabet Timed Simulation #1",
    dsa: [
      { id: "dsa-38-1", title: "Mock Round 1: Re-solve Flagged Tree/Graph Hard (45m)", difficulty: "Hard", leetcode: 297 }
    ],
    systemDesign: {
      id: "sd-38",
      title: "System Design Mock #3: Design YouTube / Video Streaming",
      category: "Timed Mock",
      focus: "Full 45-min timed drill: ingestion, transcoding DAG, CDN caching, view counter."
    }
  },
  {
    day: 39,
    date: "Dec 25, 2026",
    weekday: "Fri",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "Alphabet Timed Simulation #2",
    dsa: [
      { id: "dsa-39-1", title: "Mock Round 2: Re-solve Flagged DP / Sliding Window (45m)", difficulty: "Hard", leetcode: 76 }
    ],
    systemDesign: {
      id: "sd-39",
      title: "System Design Mock #4: Design Distributed Rate Limiter & API Gateway",
      category: "Timed Mock",
      focus: "Full 45-min timed drill: multi-region sync, Redis Lua scripts, fail-open vs. fail-closed."
    }
  },
  {
    day: 40,
    date: "Dec 26, 2026",
    weekday: "Sat",
    phase: 4,
    phaseTitle: "DP & Alphabet Mocks",
    pattern: "Final Readiness & Behavioral Calibration",
    dsa: [
      { id: "dsa-40-1", title: "Mock Round 3: Clean Code & Edge Case Audit (45m)", difficulty: "Medium", leetcode: 128 }
    ],
    systemDesign: {
      id: "sd-40",
      title: "System Design Mock #5: Design Uber / Proximity Matching + Googleyness",
      category: "Timed Mock",
      focus: "Final 45-min mock + STAR stories for ambiguity, conflict, and L4/L5 technical leadership."
    }
  }
];

export const TIMER_MODES = [
  {
    id: 'struggle',
    label: '20m Struggle Rule',
    seconds: 20 * 60,
    modeClass: 'sp-mode-struggle',
    badgeClass: 'sp-mode-struggle-badge',
    boxClass: 'sp-mode-struggle-box',
    iconColor: '#fbbf24'
  },
  {
    id: 'dsa',
    label: '2h DSA Sprint',
    seconds: 120 * 60,
    modeClass: 'sp-mode-dsa',
    badgeClass: 'sp-mode-dsa-badge',
    boxClass: 'sp-mode-dsa-box',
    iconColor: '#818cf8'
  },
  {
    id: 'sysdesign',
    label: '1h System Design',
    seconds: 60 * 60,
    modeClass: 'sp-mode-sysdesign',
    badgeClass: 'sp-mode-sysdesign-badge',
    boxClass: 'sp-mode-sysdesign-box',
    iconColor: '#34d399'
  },
  {
    id: 'mock',
    label: '45m Alphabet Mock',
    seconds: 45 * 60,
    modeClass: 'sp-mode-mock',
    badgeClass: 'sp-mode-mock-badge',
    boxClass: 'sp-mode-mock-box',
    iconColor: '#fb7185'
  }
];

export const DEFAULT_JOURNAL_ENTRY = {
  patternNotes: '',
  edgeCases: '',
  systemDesignNotes: '',
  confidence: 0
};
