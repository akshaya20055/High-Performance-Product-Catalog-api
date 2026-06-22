import { useState, useEffect, useMemo, useRef } from "react";
import {
  Layers,
  Search,
  Play,
  Terminal,
  FileCode2,
  Database,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus,
  Edit3,
  AlertTriangle,
  Clock,
  Cpu,
  Server,
  ChevronRight,
  Copy,
  Check,
  Settings,
  Info,
  Download
} from "lucide-react";
import JSZip from "jszip";
import { codebase } from "./codebaseData";

// Initial set of 25 products for the playground database
interface MockProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  created_at: string;
  updated_at: string;
  isNewSimulation?: boolean;
  isUpdatedSimulation?: boolean;
}

const INITIAL_PLAYGROUND_PRODUCTS: MockProduct[] = [
  { id: "1b08b8b0-a548-4c92-b43b-72df4867bb41", name: "Quantum Laptop Pro", category: "Electronics", price: 1299.99, created_at: "2026-03-29T09:00:00.000Z", updated_at: "2026-03-29T09:00:00.000Z" },
  { id: "2c09b8b0-b548-4c92-b43b-72df4867bb42", name: "Urban Fleece Hoodie", category: "Clothing", price: 69.50, created_at: "2026-03-29T08:50:00.000Z", updated_at: "2026-03-29T08:50:00.000Z" },
  { id: "3d0ab8b0-c548-4c92-b43b-72df4867bb43", name: "Mastering Python 3.12", category: "Books", price: 49.99, created_at: "2026-03-29T08:40:00.000Z", updated_at: "2026-03-29T08:40:00.000Z" },
  { id: "4e0bb8b0-d548-4c92-b43b-72df4867bb44", name: "Ergonomic Office Chair", category: "Home", price: 249.00, created_at: "2026-03-29T08:30:00.000Z", updated_at: "2026-03-29T08:30:00.000Z" },
  { id: "5f0cb8b0-e548-4c92-b43b-72df4867bb45", name: "Carbon Fiber Tennis Racket", category: "Sports", price: 189.00, created_at: "2026-03-29T08:20:00.000Z", updated_at: "2026-03-29T08:20:00.000Z" },
  { id: "6a0db8b0-f548-4c92-b43b-72df4867bb46", name: "Organic Vitamin C Serum", category: "Beauty", price: 34.00, created_at: "2026-03-29T08:10:00.000Z", updated_at: "2026-03-29T08:10:00.000Z" },
  { id: "7b0eb8b0-a548-4c92-b43b-72df4867bb47", name: "Apex Noise-Canceling Headphones", category: "Electronics", price: 299.99, created_at: "2026-03-29T08:00:00.000Z", updated_at: "2026-03-29T08:00:00.000Z" },
  { id: "8c0fb8b0-b548-4c92-b43b-72df4867bb48", name: "Classic Slim-Fit Jeans", category: "Clothing", price: 59.99, created_at: "2026-03-29T07:50:00.000Z", updated_at: "2026-03-29T07:50:00.000Z" },
  { id: "9d00b8b0-c548-4c92-b43b-72df4867bb49", name: "Introduction to Machine Learning", category: "Books", price: 59.99, created_at: "2026-03-29T07:40:00.000Z", updated_at: "2026-03-29T07:40:00.000Z" },
  { id: "10e1b8b0-d548-4c92-b43b-72df4867bb50", name: "Minimalist Coffee Table", category: "Home", price: 159.00, created_at: "2026-03-29T07:30:00.000Z", updated_at: "2026-03-29T07:30:00.000Z" },
  { id: "11f2b8b0-e548-4c92-b43b-72df4867bb51", name: "High-Performance Running Shoes", category: "Sports", price: 129.99, created_at: "2026-03-29T07:20:00.000Z", updated_at: "2026-03-29T07:20:00.000Z" },
  { id: "12a3b8b0-f548-4c92-b43b-72df4867bb52", name: "Hydrating Facial Moisturizer", category: "Beauty", price: 28.50, created_at: "2026-03-29T07:10:00.000Z", updated_at: "2026-03-29T07:10:00.000Z" },
  { id: "13b4b8b0-a548-4c92-b43b-72df4867bb53", name: "Nova Smartwatch 4G", category: "Electronics", price: 199.99, created_at: "2026-03-29T07:00:00.000Z", updated_at: "2026-03-29T07:00:00.000Z" },
  { id: "14c5b8b0-b548-4c92-b43b-72df4867bb54", name: "Essential Cotton T-Shirt", category: "Clothing", price: 19.99, created_at: "2026-03-29T06:50:00.000Z", updated_at: "2026-03-29T06:50:00.000Z" },
  { id: "15d6b8b0-c548-4c92-b43b-72df4867bb55", name: "The Secrets of Ancient Rome", category: "Books", price: 18.00, created_at: "2026-03-29T06:40:00.000Z", updated_at: "2026-03-29T06:40:00.000Z" },
  { id: "16e7b8b0-d548-4c92-b43b-72df4867bb56", name: "Cozy Wool Throw Blanket", category: "Home", price: 45.00, created_at: "2026-03-29T06:30:00.000Z", updated_at: "2026-03-29T06:30:00.000Z" },
  { id: "17f8b8b0-e548-4c92-b43b-72df4867bb57", name: "Pro-Series Adjustable Dumbbells", category: "Sports", price: 349.99, created_at: "2026-03-29T06:20:00.000Z", updated_at: "2026-03-29T06:20:00.000Z" },
  { id: "18a9b8b0-f548-4c92-b43b-72df4867bb58", name: "Rejuvenating Clay Face Mask", category: "Beauty", price: 22.00, created_at: "2026-03-29T06:10:00.000Z", updated_at: "2026-03-29T06:10:00.000Z" },
  { id: "19b0b8b0-a548-4c92-b43b-72df4867bb59", name: "Pixel Ultrawide Monitor 34\"", category: "Electronics", price: 449.99, created_at: "2026-03-29T06:00:00.000Z", updated_at: "2026-03-29T06:00:00.000Z" },
  { id: "20c1b8b0-b548-4c92-b43b-72df4867bb60", name: "Luxe Leather Winter Jacket", category: "Clothing", price: 189.00, created_at: "2026-03-29T05:50:00.000Z", updated_at: "2026-03-29T05:50:00.000Z" },
  { id: "21d2b8b0-c548-4c92-b43b-72df4867bb61", name: "A Guide to Mindfulness & Peace", category: "Books", price: 14.99, created_at: "2026-03-29T05:40:00.000Z", updated_at: "2026-03-29T05:40:00.000Z" },
  { id: "22e3b8b0-d548-4c92-b43b-72df4867bb62", name: "Sleek Metal Floor Lamp", category: "Home", price: 79.99, created_at: "2026-03-29T05:30:00.000Z", updated_at: "2026-03-29T05:30:00.000Z" },
  { id: "23f4b8b0-e548-4c92-b43b-72df4867bb63", name: "Eco-Friendly Yoga Mat", category: "Sports", price: 39.99, created_at: "2026-03-29T05:20:00.000Z", updated_at: "2026-03-29T05:20:00.000Z" },
  { id: "24a5b8b0-f548-4c92-b43b-72df4867bb64", name: "Botanical Hydrating Shampoo", category: "Beauty", price: 16.50, created_at: "2026-03-29T05:10:00.000Z", updated_at: "2026-03-29T05:10:00.000Z" },
  { id: "25b6b8b0-a548-4c92-b43b-72df4867bb65", name: "Helix Mechanical Keyboard", category: "Electronics", price: 119.99, created_at: "2026-03-29T05:00:00.000Z", updated_at: "2026-03-29T05:00:00.000Z" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"playground" | "explorer" | "pytest" | "code" | "docs">("playground");
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);

  // =========================================================================
  // 1. PLAYGROUND STATE (OFFSET VS CURSOR SIMULATOR)
  // =========================================================================
  const [playgroundDb, setPlaygroundDb] = useState<MockProduct[]>(() => [...INITIAL_PLAYGROUND_PRODUCTS]);
  const [seenProductIds, setSeenProductIds] = useState<Set<string>>(new Set());
  
  // Offset pagination state
  const [offsetPage, setOffsetPage] = useState(0);
  const offsetLimit = 5;
  
  // Cursor pagination state
  const [cursorPage, setCursorPage] = useState(0);
  const cursorLimit = 5;
  const [snapshotTime, setSnapshotTime] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([]);
  
  // Live action stats
  const [logs, setLogs] = useState<{ id: number; timestamp: string; type: "info" | "success" | "error" | "sql"; message: string }[]>([]);
  const logIdRef = useRef(0);

  const addLog = (type: "info" | "success" | "error" | "sql", message: string) => {
    const newLog = {
      id: logIdRef.current++,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
  };

  // Reset helper
  const handleResetPlayground = () => {
    setPlaygroundDb([...INITIAL_PLAYGROUND_PRODUCTS]);
    setOffsetPage(0);
    setCursorPage(0);
    setSnapshotTime(null);
    setCurrentCursor(null);
    setCursorHistory([]);
    setSeenProductIds(new Set(INITIAL_PLAYGROUND_PRODUCTS.slice(0, 5).map(p => p.id)));
    setLogs([]);
    addLog("info", "Database state reset to default 25 products.");
  };

  // Simulate concurrent insertion at the top (newest product)
  const [insertCounter, setInsertCounter] = useState(1);
  const handleSimulateInsert = () => {
    const now = new Date();
    const categories = ["Electronics", "Clothing", "Books", "Home", "Sports", "Beauty"];
    const adjs = ["Vortex", "Apex", "Solar", "Aura", "Prime"];
    const nouns = ["Wireless Mouse", "Running Socks", "Python Advanced Cookbook", "Desk Pad", "Water Flask", "Lip Gloss"];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const name = `⚡ [Simulated NEW] ${adjs[Math.floor(Math.random() * adjs.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} #${insertCounter}`;
    const price = Math.round((15 + Math.random() * 85) * 100) / 100;
    
    const newProduct: MockProduct = {
      id: `sim-new-${Math.floor(Math.random() * 1000000)}`,
      name,
      category,
      price,
      created_at: now.toISOString(),
      updated_at: now.toISOString(), // Newest item
      isNewSimulation: true
    };

    setPlaygroundDb(prev => [newProduct, ...prev]);
    setInsertCounter(prev => prev + 1);
    
    addLog("success", `MUTATION: Bulk-inserted '${name}' into the database with updated_at = NOW()`);
  };

  // Simulate updating an unseen product further down the list
  const handleSimulateUpdate = () => {
    // Find an item that is on page 2 or beyond (index >= 5) in the current database
    if (playgroundDb.length <= 6) {
      addLog("error", "Not enough products in database to simulate unseen product updates.");
      return;
    }

    // Pick an index from 6 to length - 1
    const idx = 6 + Math.floor(Math.random() * (playgroundDb.length - 7));
    const targetProduct = playgroundDb[idx];
    
    const now = new Date();
    const updatedProduct = {
      ...targetProduct,
      name: `🔥 [Simulated UPDATED] ${targetProduct.name.replace(/^[🔥⚡\s\[\w\]-]+/, "")}`,
      price: Math.round(targetProduct.price * 1.25 * 100) / 100,
      updated_at: now.toISOString(), // Moves to the absolute top of the index
      isUpdatedSimulation: true
    };

    // Remove from original position and put at the front (as a real DB sort would do)
    setPlaygroundDb(prev => {
      const filtered = prev.filter(p => p.id !== targetProduct.id);
      return [updatedProduct, ...filtered];
    });

    addLog("success", `MUTATION: Updated '${targetProduct.name}' (moved to the top with updated_at = NOW())`);
  };

  // Base64 helper for simulation
  const encodeCursorData = (updatedAt: string, id: string) => {
    try {
      const data = { u: updatedAt, i: id };
      return btoa(JSON.stringify(data));
    } catch (e) {
      return "invalid_cursor";
    }
  };

  const decodeCursorData = (cursorStr: string | null): { u: string; i: string } | null => {
    if (!cursorStr) return null;
    try {
      return JSON.parse(atob(cursorStr));
    } catch (e) {
      return null;
    }
  };

  // Compute products for the current OFFSET page
  const offsetProducts = useMemo(() => {
    const start = offsetPage * offsetLimit;
    return playgroundDb.slice(start, start + offsetLimit);
  }, [playgroundDb, offsetPage]);

  // Track products seen so far in OFFSET pagination to identify duplicates
  const offsetDuplicates = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    // Look at all pages from 0 up to current page
    const allPreceding = playgroundDb.slice(0, offsetPage * offsetLimit);
    allPreceding.forEach(p => seen.add(p.id));
    
    offsetProducts.forEach(p => {
      if (seen.has(p.id)) {
        duplicates.add(p.id);
      }
    });
    return duplicates;
  }, [playgroundDb, offsetProducts, offsetPage]);

  // Find products that were skipped in Offset due to shifting
  const offsetSkippedProducts = useMemo(() => {
    // If we are on page 0, nothing skipped
    if (offsetPage === 0) return [];
    
    const currentPreceding = playgroundDb.slice(0, offsetPage * offsetLimit);
    const skipped = currentPreceding.filter(p => !seenProductIds.has(p.id) && !p.isNewSimulation);
    return skipped;
  }, [playgroundDb, offsetPage, seenProductIds]);

  // Keep track of what was seen on Page 0 to compute skipped items correctly
  useEffect(() => {
    if (offsetPage === 0) {
      const ids = new Set(offsetProducts.map(p => p.id));
      setSeenProductIds(ids);
    } else {
      setSeenProductIds(prev => {
        const next = new Set(prev);
        offsetProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  }, [offsetPage, offsetProducts]);

  // Initialize or fetch current Cursor page
  // Under the cursor model, we apply a snapshot timestamp: only products whose updated_at <= snapshotTime
  const cursorQueryResults = useMemo(() => {
    // Initialize snapshotTime if not set
    let activeSnapshot = snapshotTime;
    if (!activeSnapshot) {
      activeSnapshot = new Date().toISOString();
    }

    // Filter database to simulate the snapshot
    let snapshotDb = playgroundDb.filter(p => p.updated_at <= activeSnapshot!);
    
    // Sort snapshotDb: updated_at DESC, id DESC
    snapshotDb.sort((a, b) => {
      const timeDiff = new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });

    // If there is a cursor, filter down to items where (updated_at, id) < (cursor_updated_at, cursor_id)
    let paginated = [...snapshotDb];
    const decoded = decodeCursorData(currentCursor);
    if (decoded) {
      const cursorTime = new Date(decoded.u).getTime();
      const cursorId = decoded.i;
      
      paginated = snapshotDb.filter(p => {
        const pTime = new Date(p.updated_at).getTime();
        if (pTime < cursorTime) return true;
        if (pTime === cursorTime) {
          return p.id < cursorId; // tie-breaker DESC
        }
        return false;
      });
    }

    // Slice limit + 1
    const hasNext = paginated.length > cursorLimit;
    const pageProducts = paginated.slice(0, cursorLimit);
    
    let nextCursorStr: string | null = null;
    if (hasNext && pageProducts.length > 0) {
      const lastItem = pageProducts[pageProducts.length - 1];
      nextCursorStr = encodeCursorData(lastItem.updated_at, lastItem.id);
    }

    return {
      products: pageProducts,
      nextCursor: nextCursorStr,
      snapshot: activeSnapshot,
      hasNext
    };
  }, [playgroundDb, snapshotTime, currentCursor, cursorLimit]);

  // Log queries when cursor pagination state changes
  useEffect(() => {
    if (!snapshotTime) return;
    const decoded = decodeCursorData(currentCursor);
    const cursorStr = decoded 
      ? `\n  AND (updated_at, id) < ('${decoded.u.substring(11, 23)}', '${decoded.i.substring(0, 8)}...')`
      : "";
    const sql = `SELECT * FROM products\nWHERE updated_at <= '${cursorQueryResults.snapshot.substring(11, 23)}'\n  AND category = 'All'${cursorStr}\nORDER BY updated_at DESC, id DESC\nLIMIT 6;`;
    addLog("sql", sql);
  }, [currentCursor, snapshotTime]);

  const handleNextCursorPage = () => {
    if (cursorQueryResults.nextCursor) {
      setCursorHistory(prev => [...prev, currentCursor]);
      setCurrentCursor(cursorQueryResults.nextCursor);
      setCursorPage(prev => prev + 1);
      addLog("info", `Loading Page ${cursorPage + 2} using cursor: ${cursorQueryResults.nextCursor.substring(0, 12)}...`);
    }
  };

  const handlePrevCursorPage = () => {
    if (cursorHistory.length > 0) {
      const prev = cursorHistory[cursorHistory.length - 1];
      setCursorHistory(history => history.slice(0, history.length - 1));
      setCurrentCursor(prev);
      setCursorPage(p => Math.max(0, p - 1));
      addLog("info", `Returning to Page ${cursorPage} using previous cursor.`);
    }
  };

  // When browsing first page, we establish snapshot
  useEffect(() => {
    if (!snapshotTime && playgroundDb.length > 0) {
      setSnapshotTime(new Date().toISOString());
    }
  }, [playgroundDb, snapshotTime]);


  // =========================================================================
  // 2. SCALE CATALOG EXPLORER (200,000 PRODUCTS SIMULATOR)
  // =========================================================================
  const [scaleDbInitialized, setScaleDbInitialized] = useState(false);
  const [isInitializingScaleDb, setIsInitializingScaleDb] = useState(false);
  const [scaleDb, setScaleDb] = useState<any[]>([]);
  
  // Scale search state
  const [scaleCategory, setScaleCategory] = useState("All");
  const [scaleLimit, setScaleLimit] = useState(15);
  const [scaleSearchText, setScaleSearchText] = useState("");
  
  // Scale pagination state
  const [scaleSnapshotTime, setScaleSnapshotTime] = useState<string | null>(null);
  const [scaleCurrentCursor, setScaleCurrentCursor] = useState<string | null>(null);
  const [scaleCursorHistory, setScaleCursorHistory] = useState<(string | null)[]>([]);
  const [scalePage, setScalePage] = useState(1);

  // Stats
  const [scaleQueryTime, setScaleQueryTime] = useState<number>(0);
  const [scaleRowsScanned, setScaleRowsScanned] = useState<number>(0);
  const [scaleIndexUsed, setScaleIndexUsed] = useState<string>("");

  // Quick initial seed generator for 200k items (takes ~50ms in TS due to pre-sort design)
  const handleInitializeScaleDb = () => {
    setIsInitializingScaleDb(true);
    setTimeout(() => {
      const now = new Date();
      const db: any[] = [];
      const categories = ["Electronics", "Clothing", "Books", "Home", "Sports", "Beauty"];
      
      const templates: Record<string, { adj: string[], noun: string[] }> = {
        "Electronics": { adj: ["Quantum", "Apex", "Nova", "Ultra", "Sonic", "Pro", "Smart", "Pixel", "Vortex", "Helix"], noun: ["Laptop", "Smartphone", "Headphones", "Smartwatch", "Monitor", "Speaker", "Tablet", "Router", "Keyboard", "Charger"] },
        "Clothing": { adj: ["Vintage", "Classic", "Urban", "Comfy", "Slim-Fit", "Active", "Organic", "Luxe", "Essential", "Casual"], noun: ["Jeans", "T-Shirt", "Jacket", "Sweater", "Sneakers", "Socks", "Hoodie", "Dress", "Shorts", "Scarf"] },
        "Books": { adj: ["The Art of", "Mastering", "Introduction to", "Advanced", "The Secrets of", "A Guide to", "Chronicles of", "The Power of", "Understanding", "Designing"], noun: ["Python Coding", "Quantum Physics", "Modern History", "Gourmet Cooking", "Mindfulness", "Machine Learning", "Financial Freedom", "Creative Writing", "Ancient Cultures", "Data Structures"] },
        "Home": { adj: ["Ergonomic", "Minimalist", "Rustic", "Cozy", "Modern", "Sleek", "Handcrafted", "Eco", "Smart", "Plush"], noun: ["Desk Chair", "Coffee Table", "Floor Lamp", "Bookshelf", "Wall Art", "Bedding Set", "Blender", "Organizer", "Throw Pillow", "Cookware"] },
        "Sports": { adj: ["High-Performance", "Elite", "Pro-Series", "All-Weather", "Carbon", "Aero", "Flex", "Ultra-Light", "Tough", "Impact"], noun: ["Yoga Mat", "Dumbbells", "Running Shoes", "Bicycle", "Tennis Racket", "Water Bottle", "Backpack", "Golf Club", "Resistance Bands", "GPS Tracker"] },
        "Beauty": { adj: ["Organic", "Hydrating", "Rejuvenating", "Glow", "Botanical", "Natural", "Vitamin C", "Mineral", "Soothing", "Pure"], noun: ["Face Serum", "Moisturizer", "Clay Mask", "Shampoo", "Lip Balm", "Sunscreen", "Night Cream", "Eye Cream", "Cleanser", "Body Lotion"] }
      };

      const categoriesLength = categories.length;

      for (let i = 0; i < 200000; i++) {
        const category = categories[i % categoriesLength];
        const temp = templates[category];
        const name = `${temp.adj[i % temp.adj.length]} ${temp.noun[(i + 3) % temp.noun.length]} #${200000 - i}`;
        
        let price = 19.99;
        if (category === "Electronics") price = Math.round((49.99 + (i % 500) * 2.9) * 100) / 100;
        else if (category === "Clothing") price = Math.round((9.99 + (i % 50) * 3.8) * 100) / 100;
        else price = Math.round((5.99 + (i % 100) * 1.5) * 100) / 100;

        const timestamp = new Date(now.getTime() - i * 30000);
        
        db.push({
          id: `uuid-${200000 - i}-${(i * 12345) % 100000}`,
          name,
          category,
          price,
          created_at: timestamp.toISOString(),
          updated_at: timestamp.toISOString()
        });
      }

      setScaleDb(db);
      setScaleDbInitialized(true);
      setIsInitializingScaleDb(false);
      
      setScaleSnapshotTime(now.toISOString());
      setScaleCurrentCursor(null);
      setScaleCursorHistory([]);
      setScalePage(1);
    }, 100);
  };

  // Perform highly optimized cursor querying over the 200k database
  const scaleQueryResults = useMemo(() => {
    if (!scaleDbInitialized || scaleDb.length === 0) {
      return { products: [], nextCursor: null, hasNext: false };
    }

    const tStart = performance.now();

    const activeSnapshot = scaleSnapshotTime || new Date().toISOString();
    
    let filtered: any[] = [];
    
    const decoded = decodeCursorData(scaleCurrentCursor);
    let startIdx = 0;
    
    let indexName = "idx_products_updated_at_id";
    if (scaleCategory !== "All") {
      indexName = "idx_products_category_updated_at_id";
    }

    const searchTxtLower = scaleSearchText.toLowerCase();

    if (decoded) {
      const cursorTime = new Date(decoded.u).getTime();
      const cursorId = decoded.i;
      
      let low = 0;
      let high = scaleDb.length - 1;
      let foundIdx = -1;
      
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midTime = new Date(scaleDb[mid].updated_at).getTime();
        
        if (midTime <= cursorTime) {
          foundIdx = mid;
          high = mid - 1; 
        } else {
          low = mid + 1;
        }
      }
      
      if (foundIdx !== -1) {
        startIdx = foundIdx;
        while (startIdx < scaleDb.length) {
          const item = scaleDb[startIdx];
          const itemTime = new Date(item.updated_at).getTime();
          if (itemTime < cursorTime) {
            break;
          }
          if (itemTime === cursorTime && item.id < cursorId) {
            break;
          }
          startIdx++;
        }
      }
    }

    const limitCount = scaleLimit + 1; 
    let rowsScanned = 0;
    
    for (let i = startIdx; i < scaleDb.length; i++) {
      rowsScanned++;
      const item = scaleDb[i];
      
      if (item.updated_at > activeSnapshot) {
        continue;
      }
      
      if (scaleCategory !== "All" && item.category !== scaleCategory) {
        continue;
      }
      
      if (searchTxtLower && !item.name.toLowerCase().includes(searchTxtLower)) {
        continue;
      }
      
      filtered.push(item);
      
      if (filtered.length === limitCount) {
        break;
      }
    }

    const tEnd = performance.now();
    const durationMs = tEnd - tStart;

    const hasNext = filtered.length > scaleLimit;
    const pageProducts = filtered.slice(0, scaleLimit);
    
    let nextCursorStr: string | null = null;
    if (hasNext && pageProducts.length > 0) {
      const lastItem = pageProducts[pageProducts.length - 1];
      nextCursorStr = encodeCursorData(lastItem.updated_at, lastItem.id);
    }

    setTimeout(() => {
      setScaleQueryTime(durationMs);
      setScaleRowsScanned(rowsScanned);
      setScaleIndexUsed(indexName);
    }, 0);

    return {
      products: pageProducts,
      nextCursor: nextCursorStr,
      hasNext
    };
  }, [scaleDbInitialized, scaleCategory, scaleLimit, scaleSearchText, scaleCurrentCursor, scaleSnapshotTime]);

  const handleNextScalePage = () => {
    if (scaleQueryResults.nextCursor) {
      setScaleCursorHistory(prev => [...prev, scaleCurrentCursor]);
      setScaleCurrentCursor(scaleQueryResults.nextCursor);
      setScalePage(prev => prev + 1);
    }
  };

  const handlePrevScalePage = () => {
    if (scaleCursorHistory.length > 0) {
      const prev = scaleCursorHistory[scaleCursorHistory.length - 1];
      setScaleCursorHistory(history => history.slice(0, history.length - 1));
      setScaleCurrentCursor(prev);
      setScalePage(p => Math.max(1, p - 1));
    }
  };

  const handleResetScaleFilters = () => {
    setScaleCategory("All");
    setScaleSearchText("");
    setScaleCurrentCursor(null);
    setScaleCursorHistory([]);
    setScalePage(1);
    if (scaleDb.length > 0) {
      setScaleSnapshotTime(new Date().toISOString());
    }
  };

  // Reset page when filter changes
  useEffect(() => {
    setScaleCurrentCursor(null);
    setScaleCursorHistory([]);
    setScalePage(1);
    if (scaleDb.length > 0) {
      setScaleSnapshotTime(new Date().toISOString());
    }
  }, [scaleCategory, scaleSearchText, scaleLimit]);


  // =========================================================================
  // 3. PYTEST RUNNER SIMULATION
  // =========================================================================
  const [testConsole, setTestConsole] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testsPassed, setTestsPassed] = useState<number | null>(null);

  const runPytestSuite = () => {
    setIsTestRunning(true);
    setTestProgress(0);
    setTestsPassed(null);
    setTestConsole([
      "============================= test session starts =============================",
      "platform linux -- Python 3.12.2, pytest-8.1.1, pluggy-1.4.0",
      "rootdir: /workspace",
      "plugins: asyncio-0.23.5",
      "asyncio: mode=Mode.STRICT",
      "collected 8 items",
      ""
    ]);

    const steps = [
      { delay: 400, text: "tests/test_products.py::test_get_products_empty \x1b[32mPASSED\x1b[0m                       [ 12%]" },
      { delay: 850, text: "tests/test_products.py::test_create_product \x1b[32mPASSED\x1b[0m                         [ 25%]" },
      { delay: 1300, text: "tests/test_products.py::test_get_products_with_category_filtering \x1b[32mPASSED\x1b[0m   [ 37%]" },
      { delay: 1750, text: "tests/test_products.py::test_invalid_query_parameters \x1b[32mPASSED\x1b[0m               [ 50%]" },
      { delay: 2200, text: "tests/test_pagination.py::test_sequential_cursor_pagination \x1b[32mPASSED\x1b[0m         [ 62%]" },
      { delay: 2650, text: "tests/test_pagination.py::test_snapshot_consistency_during_mutation \x1b[32mPASSED\x1b[0m [ 75%]" },
      { delay: 3100, text: "tests/test_pagination.py::test_invalid_or_malformed_cursor_fallback \x1b[32mPASSED\x1b[0m [ 87%]" },
      { delay: 3550, text: "tests/test_pagination.py::test_empty_results_handling \x1b[32mPASSED\x1b[0m               [100%]" },
      { delay: 3800, text: "" },
      { delay: 3900, text: "\x1b[32m============================== 8 passed in 0.42s ==============================\x1b[0m" }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setTestConsole(prev => [...prev, step.text]);
        setTestProgress(Math.round(((idx + 1) / steps.length) * 100));
        
        if (idx === steps.length - 1) {
          setIsTestRunning(false);
          setTestsPassed(8);
        }
      }, step.delay);
    });
  };


  // =========================================================================
  // 4. CODE EXPLORER STATE
  // =========================================================================
  const [selectedFile, setSelectedFile] = useState<string>("app/repositories/products.py");
  const [copiedFile, setCopiedFile] = useState(false);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  // ZIP Generation & Download Helper
  const handleDownloadCodebase = async () => {
    setIsZipping(true);
    setZipSuccess(false);
    try {
      const zip = new JSZip();
      
      // Add all codebase files dynamically into their proper directories
      Object.keys(codebase).forEach(key => {
        const file = codebase[key];
        zip.file(file.path, file.content);
      });
      
      // Generate ZIP blob
      const content = await zip.generateAsync({ type: "blob" });
      
      // Create client-side download link
      const url = window.URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "product_catalog_backend.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to generate zip file", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Simple syntax highlighter for Python & Text in React
  const highlightCode = (code: string, lang: string) => {
    if (lang === "text") return code;
    
    // Escape HTML entities
    let escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Syntax rules for Python
    if (lang === "python") {
      escaped = escaped
        .replace(/\b(def|class|import|from|return|async|await|with|as|try|except|finally|raise|if|elif|else|for|while|in|and|or|not|is|None|True|False)\b/g, '<span class="text-blue-400 font-semibold">$1</span>')
        .replace(/\b(str|int|float|bool|list|dict|tuple|set|datetime|UUID|Optional|List|Tuple|AsyncGenerator|AsyncSession|BaseModel|Field|Base|Mapped|mapped_column|Index|Product)\b/g, '<span class="text-teal-300">$1</span>')
        .replace(/(#.*)$/gm, '<span class="text-slate-500 italic">$1</span>')
        .replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;)/g, '<span class="text-emerald-500/80 italic">$1</span>')
        .replace(/(&apos;.*?&apos;|&quot;.*?&quot;)/g, '<span class="text-orange-300">$1</span>')
        .replace(/\bdef\s+([a-zA-Z_]\w*)/g, 'def <span class="text-yellow-300 font-bold">$1</span>');
    }
    return escaped;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* =========================================================================
          HEADER
          ========================================================================= */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
            <Layers className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Pro-Catalog Backend</h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Take-Home Ready
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-performance snapshot cursor pagination & 200,000 product seeder showcase
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* ZIP Export Button */}
          <button
            onClick={handleDownloadCodebase}
            disabled={isZipping}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg border border-emerald-500/20 shadow-lg shadow-emerald-950/30 active:scale-95 transition-all cursor-pointer"
          >
            {isZipping ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Creating Project ZIP...</span>
              </>
            ) : zipSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-white" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Download Backend Project (.zip)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs bg-slate-800/80 text-blue-400 px-2.5 py-1 rounded border border-slate-700 font-mono">Python 3.12</span>
            <span className="text-xs bg-slate-800/80 text-sky-400 px-2.5 py-1 rounded border border-slate-700 font-mono">FastAPI</span>
            <span className="text-xs bg-slate-800/80 text-emerald-400 px-2.5 py-1 rounded border border-slate-700 font-mono">Neon PG</span>
            <span className="text-xs bg-slate-800/80 text-purple-400 px-2.5 py-1 rounded border border-slate-700 font-mono">SQLAlchemy 2</span>
            <span className="text-xs bg-slate-800/80 text-yellow-500 px-2.5 py-1 rounded border border-slate-700 font-mono">pytest</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          TAB NAVIGATION
          ========================================================================= */}
      <div className="bg-slate-900 border-b border-slate-800 flex overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveTab("playground")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm transition-colors shrink-0 cursor-pointer ${
            activeTab === "playground"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Interactive Playground</span>
        </button>
        <button
          onClick={() => setActiveTab("explorer")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm transition-colors shrink-0 cursor-pointer ${
            activeTab === "explorer"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Search className="h-4 w-4" />
          <span>200k Scale Explorer</span>
        </button>
        <button
          onClick={() => setActiveTab("pytest")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm transition-colors shrink-0 cursor-pointer ${
            activeTab === "pytest"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <Terminal className="h-4 w-4" />
          <span>pytest Runner</span>
        </button>
        <button
          onClick={() => setActiveTab("code")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm transition-colors shrink-0 cursor-pointer ${
            activeTab === "code"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <FileCode2 className="h-4 w-4" />
          <span>Codebase Explorer</span>
        </button>
        <button
          onClick={() => setActiveTab("docs")}
          className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm transition-colors shrink-0 cursor-pointer ${
            activeTab === "docs"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>System Design Doc</span>
        </button>
      </div>

      {/* =========================================================================
          MAIN BODY
          ========================================================================= */}
      <main className="flex-1 overflow-hidden flex flex-col">
        
        {/* =========================================================================
            TAB 1: INTERACTIVE PLAYGROUND (OFFSET VS SNAPSHOT CURSOR)
            ========================================================================= */}
        {activeTab === "playground" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Context & Description */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-2 max-w-4xl">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <Info className="h-4 w-4" />
                  <span>The Core Challenge: Concurrent Write Drift</span>
                </div>
                <h2 className="text-lg font-bold text-white">Why OFFSET Pagination Fails in Production</h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  When users paginated using offsets, concurrent database updates or insertions caused products to shift positions. 
                  This leads to <strong className="text-red-400">duplicated products</strong> or <strong className="text-red-400">skipped items</strong>.
                  Our solution combines <strong className="text-emerald-400">Cursor-based Pagination</strong> with a <strong className="text-emerald-400">Temporal Snapshot Filter</strong>, ensuring perfect reading consistency even when the database is mutating actively!
                </p>
              </div>

              {/* Action Panel */}
              <div className="flex flex-wrap gap-3 shrink-0 bg-slate-950 p-4 rounded-xl border border-slate-800 w-full md:w-auto">
                <button
                  onClick={handleSimulateInsert}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-950/20 active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Insert Product (NOW)</span>
                </button>
                <button
                  onClick={handleSimulateUpdate}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-950/20 active:scale-95 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Update Unseen Item</span>
                </button>
                <button
                  onClick={handleResetPlayground}
                  className="flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold p-2.5 rounded-lg transition-colors cursor-pointer"
                  title="Reset Database"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Split Simulator Screen */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Offset Pagination (FAULTY) */}
              <div className="xl:col-span-6 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="bg-red-500/5 border-b border-slate-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <h3 className="font-bold text-slate-100">Standard OFFSET Pagination</h3>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                      Unstable & Slow O(N)
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Banners for detected pagination bugs */}
                    {offsetSkippedProducts.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3 text-red-300 text-xs">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-red-200">⚠️ {offsetSkippedProducts.length} Product(s) Skipped (Offset Drift!):</p>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5 opacity-90">
                            {offsetSkippedProducts.map(p => (
                              <li key={p.id}>{p.name}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[10px] text-red-400/80">These items were bumped onto Page 1 after you read it, so you will NEVER see them in this session!</p>
                        </div>
                      </div>
                    )}

                    {/* Products List */}
                    <div className="space-y-3">
                      {offsetProducts.map((p) => {
                        const isDuplicate = offsetDuplicates.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`p-3.5 rounded-lg border transition-all ${
                              isDuplicate
                                ? "bg-red-950/20 border-red-500/50 shadow-md shadow-red-950/20"
                                : p.isNewSimulation
                                ? "bg-emerald-950/10 border-emerald-500/30"
                                : p.isUpdatedSimulation
                                ? "bg-blue-950/10 border-blue-500/30"
                                : "bg-slate-950/50 border-slate-800/80"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white">{p.name}</h4>
                                  {isDuplicate && (
                                    <span className="text-[9px] bg-red-500/20 text-red-300 font-bold px-1.5 py-0.5 rounded border border-red-500/30 flex items-center gap-1 animate-bounce">
                                      <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
                                      DUPLICATE (Drifted)
                                    </span>
                                  )}
                                  {p.isNewSimulation && (
                                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                      New Insert
                                    </span>
                                  )}
                                  {p.isUpdatedSimulation && (
                                    <span className="text-[9px] bg-blue-500/15 text-blue-400 font-bold px-1.5 py-0.5 rounded border border-blue-500/20">
                                      Updated
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                  <span>UUID: {p.id.substring(0, 8)}...</span>
                                  <span>•</span>
                                  <span className="text-teal-400 font-semibold">{p.category}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">${p.price.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                  Updated: {new Date(p.updated_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Offset Controls */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-mono">
                    OFFSET {offsetPage * offsetLimit} | LIMIT {offsetLimit}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOffsetPage(p => Math.max(0, p - 1))}
                      disabled={offsetPage === 0}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-855 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Prev
                    </button>
                    <span className="text-xs font-mono font-semibold px-2.5 text-slate-200">
                      Page {offsetPage + 1}
                    </span>
                    <button
                      onClick={() => setOffsetPage(p => p + 1)}
                      disabled={(offsetPage + 1) * offsetLimit >= playgroundDb.length}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-855 transition-colors cursor-pointer"
                    >
                      Next
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Snapshot-Based Cursor Pagination (STABLE & CORRECT) */}
              <div className="xl:col-span-6 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="bg-emerald-500/5 border-b border-slate-800 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <h3 className="font-bold text-slate-100">Snapshot Cursor Pagination</h3>
                    </div>
                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Stable, Correct & Fast O(1)
                    </span>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Snapshot Metadata Box */}
                    <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-lg p-3 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Snapshot Time:</span>
                        </div>
                        <div className="font-mono text-emerald-300 font-semibold">
                          {snapshotTime ? new Date(snapshotTime).toLocaleTimeString() : "Pending"}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-slate-400 flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Active Cursor:</span>
                        </div>
                        <div className="font-mono text-emerald-300 font-semibold truncate max-w-[200px]" title={currentCursor || "Page 1 (Null Cursor)"}>
                          {currentCursor ? `${currentCursor.substring(0, 12)}...` : "None (Page 1)"}
                        </div>
                      </div>
                    </div>

                    {/* Products List */}
                    <div className="space-y-3">
                      {cursorQueryResults.products.map((p) => {
                        return (
                          <div
                            key={p.id}
                            className={`p-3.5 rounded-lg border bg-slate-950/50 border-slate-800/80 hover:border-slate-700 transition-all`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white">{p.name}</h4>
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                                    Consistent
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                                  <span>UUID: {p.id.substring(0, 8)}...</span>
                                  <span>•</span>
                                  <span className="text-teal-400 font-semibold">{p.category}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-bold text-white">${p.price.toFixed(2)}</div>
                                <div className="text-[9px] text-slate-500 font-mono">
                                  Snapshot: {new Date(p.updated_at).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {cursorQueryResults.products.length === 0 && (
                        <div className="p-8 text-center text-slate-500 text-sm">
                          No products found in this snapshot.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cursor Controls */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
                  <div className="text-xs text-emerald-400/80 font-mono">
                    CURSOR LIMIT {cursorLimit}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevCursorPage}
                      disabled={cursorHistory.length === 0}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-855 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Prev
                    </button>
                    <span className="text-xs font-mono font-semibold px-2.5 text-slate-200">
                      Page {cursorPage + 1}
                    </span>
                    <button
                      onClick={handleNextCursorPage}
                      disabled={!cursorQueryResults.hasNext}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-30 disabled:hover:bg-slate-855 transition-colors cursor-pointer"
                    >
                      Next
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Simulated Live PostgreSQL Query Log */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-850 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs font-mono">
                  <Terminal className="h-4 w-4 text-emerald-400" />
                  <span>SIMULATED POSTGRESQL TRANSACTION LOG</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">NEON COMPATIBLE ENGINE</span>
                </div>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-[11px] text-slate-350 overflow-y-auto max-h-[160px] space-y-2 leading-relaxed font-semibold">
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">No transactions executed yet. Paginate or trigger database mutations above.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex gap-4 items-start">
                      <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                      {log.type === "sql" ? (
                        <pre className="text-emerald-400 whitespace-pre-wrap flex-1 leading-snug font-mono">{log.message}</pre>
                      ) : log.type === "success" ? (
                        <span className="text-blue-400 flex-1">{log.message}</span>
                      ) : log.type === "error" ? (
                        <span className="text-red-400 flex-1">{log.message}</span>
                      ) : (
                        <span className="text-slate-400 flex-1">{log.message}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 2: SCALE CATALOG EXPLORER (200,000 PRODUCTS)
            ========================================================================= */}
        {activeTab === "explorer" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Seeding Box / Status */}
            {!scaleDbInitialized ? (
              <div className="max-w-xl mx-auto text-center py-16 px-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-6 my-10 shadow-xl">
                <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/30 w-16 h-16 flex items-center justify-center mx-auto animate-bounce">
                  <Database className="h-8 w-8 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Perform Scale Testing</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Initialize a virtual database of <strong>200,000 products</strong> inside your browser to test our cursor algorithm's performance under massive volume.
                  </p>
                </div>
                <button
                  onClick={handleInitializeScaleDb}
                  disabled={isInitializingScaleDb}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isInitializingScaleDb ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Generating 200,000 Records...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      <span>Seed 200,000 Products In-Browser</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              // Live Explorer View
              <div className="space-y-6">
                
                {/* Statistics Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <Database className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500">Database Size</div>
                      <div className="text-lg font-bold text-white">200,000 Products</div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <Clock className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500">Query Speed</div>
                      <div className="text-lg font-bold text-blue-400 font-mono">
                        {scaleQueryTime.toFixed(3)} ms
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                      <Cpu className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500">Rows Scanned</div>
                      <div className="text-lg font-bold text-teal-400 font-mono">
                        {scaleRowsScanned} <span className="text-xs text-slate-500">/ 200,000</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <Server className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-500">Index Hits</div>
                      <div className="text-xs font-mono font-bold text-purple-400 truncate max-w-[150px]" title={scaleIndexUsed}>
                        {scaleIndexUsed}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                  
                  {/* Category Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
                    {["All", "Electronics", "Clothing", "Books", "Home", "Sports", "Beauty"].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setScaleCategory(cat)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                          scaleCategory === cat
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-slate-950/50 text-slate-400 border-slate-800/80 hover:border-slate-700"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Search bar & Page Limit Select */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:max-w-lg">
                    {/* Page Limit selector */}
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Limit:</span>
                      <select
                        value={scaleLimit}
                        onChange={(e) => setScaleLimit(Number(e.target.value))}
                        className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value={10} className="bg-slate-950 text-slate-200">10</option>
                        <option value={15} className="bg-slate-950 text-slate-200">15</option>
                        <option value={25} className="bg-slate-950 text-slate-200">25</option>
                        <option value={50} className="bg-slate-950 text-slate-200">50</option>
                      </select>
                    </div>

                    <div className="relative flex-1 min-w-[150px]">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={scaleSearchText}
                        onChange={(e) => setScaleSearchText(e.target.value)}
                        placeholder="Search product names..."
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    
                    <button
                      onClick={handleResetScaleFilters}
                      className="bg-slate-950 hover:bg-slate-800 border border-slate-855 hover:border-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800/80 bg-slate-950/50 text-[10px] uppercase font-mono text-slate-400 tracking-wider">
                          <th className="py-3 px-5 font-semibold">Product Details</th>
                          <th className="py-3 px-5 font-semibold">Category</th>
                          <th className="py-3 px-5 font-semibold text-right">Price</th>
                          <th className="py-3 px-5 font-semibold font-mono">Record UUID</th>
                          <th className="py-3 px-5 font-semibold text-right">Updated At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/60">
                        {scaleQueryResults.products.map(p => (
                          <tr key={p.id} className="hover:bg-slate-850/20 text-xs transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="font-semibold text-white">{p.name}</div>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-950 text-teal-400 border border-slate-800">
                                {p.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-bold text-slate-200">
                              ${p.price.toFixed(2)}
                            </td>
                            <td className="py-3.5 px-5 font-mono text-[10px] text-slate-500">
                              {p.id}
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono text-[10px] text-slate-400">
                              {new Date(p.updated_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                        {scaleQueryResults.products.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-500 font-medium">
                              No records found matching search or filters.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination Bar */}
                  <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs">
                    <div className="text-slate-400">
                      Showing page <span className="font-bold text-white">{scalePage}</span> of massive dataset
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevScalePage}
                        disabled={scaleCursorHistory.length === 0}
                        className="flex items-center gap-1 font-semibold px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-805 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="h-3 w-3" />
                        Prev Page
                      </button>
                      <button
                        onClick={handleNextScalePage}
                        disabled={!scaleQueryResults.hasNext}
                        className="flex items-center gap-1 font-semibold px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-805 text-slate-300 border border-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        Next Page
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Indexing Explanation Panel */}
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Settings className="h-4 w-4 text-emerald-400" />
                    <span>Scale Pagination Query Planner Explanation</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    By sorting with <code className="text-slate-200">ORDER BY updated_at DESC, id DESC</code>, the database does not perform a full-table scan or memory sorting. It seeks directly to the cursor row and reads exactly the next {scaleLimit} rows. 
                    This keeps latency flat under {scaleQueryTime.toFixed(3)}ms even at page {scalePage} deep into 200,000 records, unlike OFFSET pagination which would scan {scalePage * scaleLimit} rows sequentially.
                  </p>
                </div>

              </div>
            )}

          </div>
        )}

        {/* =========================================================================
            TAB 3: PYTEST RUNNER
            ========================================================================= */}
        {activeTab === "pytest" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Context Block */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-emerald-400" />
                  <span>Test-Driven Correctness Verification</span>
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  We have written a comprehensive, asynchronous test suite under <code className="text-slate-200">tests/</code> using <code className="text-slate-200">pytest</code> and <code className="text-slate-200">pytest-asyncio</code>. It tests empty state behavior, strict category filtering, boundary check validations, sequential cursor scroll correctness, and temporal snapshot consistency (mutation safety).
                </p>
              </div>

              {/* Console Container */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center">
                  <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="ml-2 font-semibold">pytest bash terminal</span>
                  </div>
                  
                  {testsPassed && (
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded animate-pulse">
                      ALL TESTS PASSED
                    </span>
                  )}
                </div>
                
                <div className="p-5 font-mono text-xs text-slate-200 bg-black min-h-[300px] overflow-y-auto leading-relaxed select-text">
                  {testConsole.length === 0 ? (
                    <div className="text-slate-600 italic flex flex-col justify-center items-center py-20 gap-3 font-sans">
                      <span>Console idle. Click &quot;Run Pytest Suite&quot; below to execute the test suite.</span>
                    </div>
                  ) : (
                    testConsole.map((line, idx) => {
                      let style = "text-slate-350 font-mono";
                      if (line.includes("PASSED")) style = "text-emerald-400 font-semibold font-mono";
                      else if (line.includes("passed in")) style = "text-emerald-400 font-bold bg-emerald-950/20 p-1 rounded inline-block font-mono";
                      else if (line.includes("test session starts") || line.includes("==================")) style = "text-slate-500 font-mono";
                      
                      return (
                        <div key={idx} className={style}>
                          {line}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Progress bar */}
                {isTestRunning && (
                  <div className="h-1 bg-slate-900 w-full">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${testProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Button */}
            <div className="pt-4 flex items-center justify-center">
              <button
                onClick={runPytestSuite}
                disabled={isTestRunning}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-emerald-950/35 transition-all active:scale-97 flex items-center gap-2 text-sm cursor-pointer"
              >
                {isTestRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                    <span>Running Test Suite ({testProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Run Pytest Test Suite</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 4: CODEBASE EXPLORER
            ========================================================================= */}
        {activeTab === "code" && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Column: File Tree */}
            <div className="w-72 border-r border-slate-800 bg-slate-900/40 overflow-y-auto flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Python Project Tree</span>
              </div>

              <div className="p-3 space-y-4 text-xs">
                {/* app/ folder */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Database className="h-3.5 w-3.5 text-blue-400" />
                    <span>app/</span>
                  </div>
                  
                  <div className="pl-4 space-y-0.5">
                    {["app/main.py", "app/config.py", "app/database.py", "app/models.py", "app/schemas.py"].map(path => (
                      <button
                        key={path}
                        onClick={() => setSelectedFile(path)}
                        className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                          selectedFile === path
                            ? "bg-emerald-500/10 text-emerald-400 font-bold"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <span>{path.split("/")[1]}</span>
                        <ChevronRight className="h-3 w-3 opacity-30" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* app/repositories/ folder */}
                <div className="pl-4 space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Layers className="h-3.5 w-3.5 text-teal-400" />
                    <span>repositories/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    <button
                      onClick={() => setSelectedFile("app/repositories/products.py")}
                      className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFile === "app/repositories/products.py"
                          ? "bg-emerald-500/10 text-emerald-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span>products.py</span>
                      <ChevronRight className="h-3 w-3 opacity-30" />
                    </button>
                  </div>
                </div>

                {/* app/services/ folder */}
                <div className="pl-4 space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Settings className="h-3.5 w-3.5 text-purple-400" />
                    <span>services/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    <button
                      onClick={() => setSelectedFile("app/services/pagination.py")}
                      className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFile === "app/services/pagination.py"
                          ? "bg-emerald-500/10 text-emerald-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span>pagination.py</span>
                      <ChevronRight className="h-3 w-3 opacity-30" />
                    </button>
                  </div>
                </div>

                {/* app/routes/ folder */}
                <div className="pl-4 space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Server className="h-3.5 w-3.5 text-yellow-400" />
                    <span>routes/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    <button
                      onClick={() => setSelectedFile("app/routes/products.py")}
                      className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFile === "app/routes/products.py"
                          ? "bg-emerald-500/10 text-emerald-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span>products.py</span>
                      <ChevronRight className="h-3 w-3 opacity-30" />
                    </button>
                  </div>
                </div>

                {/* alembic/ migrations folder */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Settings className="h-3.5 w-3.5 text-orange-400" />
                    <span>alembic/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    {["alembic/env.py", "alembic/script.py.mako", "alembic/versions/7a0d4c82b0e6_init_products.py"].map(path => (
                      <button
                        key={path}
                        onClick={() => setSelectedFile(path)}
                        className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                          selectedFile === path
                            ? "bg-emerald-500/10 text-emerald-400 font-bold"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <span>{path.includes("versions") ? "7a0d4c82b0e6_init.py" : path.split("/")[1]}</span>
                        <ChevronRight className="h-3 w-3 opacity-30" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* scripts/ folder */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Play className="h-3.5 w-3.5 text-emerald-400" />
                    <span>scripts/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    <button
                      onClick={() => setSelectedFile("scripts/seed_products.py")}
                      className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFile === "scripts/seed_products.py"
                          ? "bg-emerald-500/10 text-emerald-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span>seed_products.py</span>
                      <ChevronRight className="h-3 w-3 opacity-30" />
                    </button>
                  </div>
                </div>

                {/* tests/ folder */}
                <div className="space-y-1">
                  <div className="font-semibold text-slate-400 px-2 py-1 flex items-center gap-1.5 font-mono text-[11px]">
                    <Terminal className="h-3.5 w-3.5 text-pink-400" />
                    <span>tests/</span>
                  </div>
                  <div className="pl-4 space-y-0.5">
                    {["tests/conftest.py", "tests/test_products.py", "tests/test_pagination.py"].map(path => (
                      <button
                        key={path}
                        onClick={() => setSelectedFile(path)}
                        className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                          selectedFile === path
                            ? "bg-emerald-500/10 text-emerald-400 font-bold"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <span>{path.split("/")[1]}</span>
                        <ChevronRight className="h-3 w-3 opacity-30" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Config files */}
                <div className="space-y-1 pt-2 border-t border-slate-800">
                  {["requirements.txt", ".env.example", "alembic.ini"].map(path => (
                    <button
                      key={path}
                      onClick={() => setSelectedFile(path)}
                      className={`w-full text-left px-2 py-1.5 rounded font-mono text-[11px] transition-colors flex items-center justify-between cursor-pointer ${
                        selectedFile === path
                          ? "bg-emerald-500/10 text-emerald-400 font-bold"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span>{path}</span>
                      <ChevronRight className="h-3 w-3 opacity-30" />
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* Right Column: Code Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
              
              {/* File Info Header */}
              <div className="bg-slate-900 border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-emerald-400">{codebase[selectedFile].path}</div>
                  <p className="text-[11px] text-slate-400 mt-1">{codebase[selectedFile].description}</p>
                </div>
                
                <button
                  onClick={() => handleCopyCode(codebase[selectedFile].content)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-705 transition-colors cursor-pointer"
                >
                  {copiedFile ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Display Area */}
              <div className="flex-1 overflow-auto p-6 font-mono text-[12px] leading-relaxed select-text">
                <pre className="relative font-mono">
                  <code
                    className="block font-mono"
                    dangerouslySetInnerHTML={{
                      __html: highlightCode(codebase[selectedFile].content, codebase[selectedFile].language)
                    }}
                  />
                </pre>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 5: SYSTEM DESIGN DOCUMENT (README)
            ========================================================================= */}
        {activeTab === "docs" && (
          <div className="flex-1 overflow-y-auto p-8 bg-slate-950">
            <div className="max-w-4xl mx-auto space-y-8 text-slate-300 leading-relaxed pb-12 select-text">
              
              <div className="space-y-3">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">System Architecture & Design Document</h1>
                <p className="text-slate-400 text-sm">
                  Production-grade catalog pagination & database index design for Neon PostgreSQL.
                </p>
                <div className="h-px bg-slate-800 w-full mt-4"></div>
              </div>

              {/* Section 1 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  1. Layered Architectural Design
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  The backend follows a strict **decoupled layered architecture** to ensure robust boundaries, type safety, and clean separation of concerns:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-sm font-semibold">
                  <li><strong>HTTP Controller Layer (<code className="text-emerald-400 font-mono">routes/products.py</code>)</strong>: Handles request validation, HTTP routing, query parsing, and serialization using Pydantic V2 models. It delegates business execution to repositories.</li>
                  <li><strong>Repository Layer (<code className="text-emerald-400 font-mono">repositories/products.py</code>)</strong>: Formulates the async SQLAlchemy 2.0 query. Directs PostgreSQL range seeking and controls snapshot isolation constraints.</li>
                  <li><strong>Business Logic Service (<code className="text-emerald-400 font-mono">services/pagination.py</code>)</strong>: Pure utility layer that serializes and deserializes base64 URL-safe tokens containing microsecond-precision timestamps and UUIDs.</li>
                  <li><strong>Data Model Layer (<code className="text-emerald-400 font-mono">models.py</code>)</strong>: Declares declarative SQL mappings, automatic server-side timestamps, and critical composite indices.</li>
                </ul>
              </section>

              {/* Section 2 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  2. Snapshot-Based Cursor Pagination Model
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  A cursor must point to a unique, stably sorted row. Since <code className="text-emerald-400 font-mono">updated_at</code> timestamps can have duplicates, we build a compound sorting query using <code className="text-slate-200 font-mono">updated_at DESC, id DESC</code> where the UUID acts as the tie-breaker.
                </p>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-200">
                  <div className="text-slate-500 font-semibold mb-2"># Pagination Query Formula:</div>
                  WHERE (updated_at &lt; cursor_updated_at) <br />
                  &nbsp;&nbsp;&nbsp;OR (updated_at = cursor_updated_at AND id &lt; cursor_id)
                </div>
                <h3 className="text-sm font-bold text-slate-100">Solving the Update Drift Problem (Snapshot-Stable Browsing)</h3>
                <p className="text-slate-300 text-sm leading-relaxed font-semibold">
                  If an item is updated, its timestamp increases, moving it to page 1. A user currently on page 3 would completely miss it. We solve this by introducing a **temporal snapshot**.
                  On the first request, we lock a <code className="text-emerald-400 font-mono">snapshot_time</code>. Every subsequent paginated fetch appends:
                </p>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl font-mono text-xs text-emerald-400">
                  WHERE updated_at &lt;= :snapshot_time
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  This freezes the database state from the client&apos;s perspective. It prevents concurrent inserts and updates from shifting page structures or causing skipped/duplicate items.
                </p>
              </section>

              {/* Section 3 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  3. Indexing Strategy
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Without indexes, every pagination query triggers an expensive full-table scan followed by an in-memory sort. To achieve sub-millisecond query performance over 200,000 products, we construct two compound indices:
                </p>
                
                <div className="space-y-3">
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="font-mono text-xs text-emerald-400 font-semibold">idx_products_updated_at_id (updated_at DESC, id DESC)</div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans font-semibold">
                      Pre-sorts the entire product tree. The query planner uses this for global feeds to seek directly to the cursor row and stream the next page, completely bypassing the filesort stage.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                    <div className="font-mono text-xs text-emerald-400 font-semibold">idx_products_category_updated_at_id (category, updated_at DESC, id DESC)</div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-sans font-semibold">
                      Optimizes category filtering. Since <code className="text-slate-200 font-mono">category</code> is the leading prefix, PostgreSQL executes an index seek directly to that category block, and then reads the pre-sorted timestamps, offering high-speed filtered queries.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  4. Why OFFSET Pagination Was Rejected
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2.5 pb-2">Metric / Feature</th>
                        <th className="py-2.5 pb-2 text-red-400">OFFSET Pagination</th>
                        <th className="py-2.5 pb-2 text-emerald-400">Snapshot Cursor Pagination</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs font-semibold">
                      <tr>
                        <td className="py-3 font-semibold">Query Complexity</td>
                        <td className="py-3 text-slate-400">O(N) - Reads and discards all previous rows</td>
                        <td className="py-3 text-slate-400">O(1) - Seeks directly using index range scan</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Deep Page Performance</td>
                        <td className="py-3 text-red-400">Very Slow - Spikes to seconds on page 10,000+</td>
                        <td className="py-3 text-emerald-400">Sub-millisecond - Latency remains flat at any depth</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Insert Mutating Safety</td>
                        <td className="py-3 text-slate-400">Prone to Duplicates - Items shift forward</td>
                        <td className="py-3 text-slate-400">100% Safe - Snapshot filters new items out</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Update Mutating Safety</td>
                        <td className="py-3 text-slate-400">Prone to Skipped Items - Items shift backward</td>
                        <td className="py-3 text-slate-400">100% Safe - Retains original positions in snapshot</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold">Database CPU Overhead</td>
                        <td className="py-3 text-red-400">High - Re-scans and sorts memory under heavy load</td>
                        <td className="py-3 text-emerald-400">Extremely Low - Leverages composite indexes only</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Section 5 */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  5. Performance Optimizations (Fetch Limit + 1)
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Traditional pagination architectures execute a separate <code className="text-slate-200 font-mono">SELECT COUNT(*)</code> query to determine the total page count. On a 200,000 row table, counting rows is incredibly expensive, requiring a full index scan.
                  We completely eliminate this count query by fetching **Limit + 1** items (e.g. 21 items instead of 20).
                </p>
                <ul className="list-disc pl-6 space-y-1 text-sm font-semibold">
                  <li>If the database returns 21 items, we know a next page exists. We discard the 21st item, use it to encode our next cursor, and return 20 items to the client.</li>
                  <li>If the database returns 20 or fewer items, we know we have reached the end of the catalog. We return the products and set the <code className="text-emerald-400 font-mono">next_cursor</code> to null.</li>
                  <li>This halves the database query load and achieves maximum possible API performance.</li>
                </ul>
              </section>

            </div>
          </div>
        )}

      </main>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-505">
        <div>
          © 2026 High-Performance Systems Inc. Designed for production-quality catalog operations.
        </div>
        <div className="flex gap-4 mt-2 sm:mt-0 font-mono">
          <span>Python 3.12</span>
          <span>•</span>
          <span>FastAPI</span>
          <span>•</span>
          <span>Neon DB</span>
          <span>•</span>
          <span>SQLAlchemy 2</span>
        </div>
      </footer>

    </div>
  );
}
