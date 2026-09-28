const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

if (!c.includes('useMemo } from')) {
  c = c.replace(/import \{ useState, useRef, useEffect, useCallback \} from 'react';/, "import { useState, useRef, useEffect, useCallback, useMemo } from 'react';");
  fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
}
