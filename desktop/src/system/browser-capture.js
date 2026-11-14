(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  function __accessProp(key) {
    return this[key];
  }
  var __toCommonJS = (from) => {
    var entry = (__moduleCache ??= new WeakMap).get(from), desc;
    if (entry)
      return entry;
    entry = __defProp({}, "__esModule", { value: true });
    if (from && typeof from === "object" || typeof from === "function") {
      for (var key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(entry, key))
          __defProp(entry, key, {
            get: __accessProp.bind(from, key),
            enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
          });
    }
    __moduleCache.set(from, entry);
    return entry;
  };
  var __moduleCache;
  var __returnValue = (v) => v;
  function __exportSetter(name, newValue) {
    this[name] = __returnValue.bind(null, newValue);
  }
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, {
        get: all[name],
        enumerable: true,
        configurable: true,
        set: __exportSetter.bind(all, name)
      });
  };
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/capturer/page.ts
  var exports_page = {};
  __export(exports_page, {
    captureElementHTML: () => captureElementHTML,
    capturePageHTML: () => capturePageHTML
  });
  // ../../node_modules/.bun/es-toolkit@1.52.0/node_modules/es-toolkit/dist/array/compact.mjs
  function compact(arr) {
    const result = [];
    for (let i = 0;i < arr.length; i++) {
      const item = arr[i];
      if (item)
        result.push(item);
    }
    return result;
  }
  // ../../node_modules/.bun/fflate@0.8.3/node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0]);
  var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0]);
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0;i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1;i < 30; ++i) {
      for (var j = b[i];j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0;i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = function(cd, mb, r) {
    var s = cd.length;
    var i2 = 0;
    var l = new u16(mb);
    for (;i2 < s; ++i2) {
      if (cd[i2])
        ++l[cd[i2] - 1];
    }
    var le = new u16(mb);
    for (i2 = 1;i2 < mb; ++i2) {
      le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i2 = 0;i2 < s; ++i2) {
        if (cd[i2]) {
          var sv = i2 << 4 | cd[i2];
          var r_1 = mb - cd[i2];
          var v = le[cd[i2] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1;v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i2 = 0;i2 < s; ++i2) {
        if (cd[i2]) {
          co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
        }
      }
    }
    return co;
  };
  var flt = new u8(288);
  for (i = 0;i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144;i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256;i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280;i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u8(32);
  for (i = 0;i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flm = /* @__PURE__ */ hMap(flt, 9, 0);
  var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u8(v.subarray(s, e));
  };
  var wbits = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
  };
  var wbits16 = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
  };
  var hTree = function(d, mb) {
    var t = [];
    for (var i2 = 0;i2 < d.length; ++i2) {
      if (d[i2])
        t.push({ s: i2, f: d[i2] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
      return { t: et, l: 0 };
    if (s == 1) {
      var v = new u8(t[0].s + 1);
      v[t[0].s] = 1;
      return { t: v, l: 1 };
    }
    t.sort(function(a, b) {
      return a.f - b.f;
    });
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i22 = 2;
    t[0] = { s: -1, f: l.f + r.f, l, r };
    while (i1 != s - 1) {
      l = t[t[i0].f < t[i22].f ? i0++ : i22++];
      r = t[i0 != i1 && t[i0].f < t[i22].f ? i0++ : i22++];
      t[i1++] = { s: -1, f: l.f + r.f, l, r };
    }
    var maxSym = t2[0].s;
    for (var i2 = 1;i2 < s; ++i2) {
      if (t2[i2].s > maxSym)
        maxSym = t2[i2].s;
    }
    var tr = new u16(maxSym + 1);
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
      var i2 = 0, dt = 0;
      var lft = mbt - mb, cst = 1 << lft;
      t2.sort(function(a, b) {
        return tr[b.s] - tr[a.s] || a.f - b.f;
      });
      for (;i2 < s; ++i2) {
        var i2_1 = t2[i2].s;
        if (tr[i2_1] > mb) {
          dt += cst - (1 << mbt - tr[i2_1]);
          tr[i2_1] = mb;
        } else
          break;
      }
      dt >>= lft;
      while (dt > 0) {
        var i2_2 = t2[i2].s;
        if (tr[i2_2] < mb)
          dt -= 1 << mb - tr[i2_2]++ - 1;
        else
          ++i2;
      }
      for (;i2 >= 0 && dt; --i2) {
        var i2_3 = t2[i2].s;
        if (tr[i2_3] == mb) {
          --tr[i2_3];
          ++dt;
        }
      }
      mbt = mb;
    }
    return { t: new u8(tr), l: mbt };
  };
  var ln = function(n, l, d) {
    return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
  };
  var lc = function(c) {
    var s = c.length;
    while (s && !c[--s])
      ;
    var cl = new u16(++s);
    var cli = 0, cln = c[0], cls = 1;
    var w = function(v) {
      cl[cli++] = v;
    };
    for (var i2 = 1;i2 <= s; ++i2) {
      if (c[i2] == cln && i2 != s)
        ++cls;
      else {
        if (!cln && cls > 2) {
          for (;cls > 138; cls -= 138)
            w(32754);
          if (cls > 2) {
            w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
            cls = 0;
          }
        } else if (cls > 3) {
          w(cln), --cls;
          for (;cls > 6; cls -= 6)
            w(8304);
          if (cls > 2)
            w(cls - 3 << 5 | 8208), cls = 0;
        }
        while (cls--)
          w(cln);
        cls = 1;
        cln = c[i2];
      }
    }
    return { c: cl.subarray(0, cli), n: s };
  };
  var clen = function(cf, cl) {
    var l = 0;
    for (var i2 = 0;i2 < cl.length; ++i2)
      l += cf[i2] * cl[i2];
    return l;
  };
  var wfblk = function(out, pos, dat) {
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i2 = 0;i2 < s; ++i2)
      out[o + i2 + 4] = dat[i2];
    return (o + 4 + s) * 8;
  };
  var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
    var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i2 = 0;i2 < lclt.length; ++i2)
      ++lcfreq[lclt[i2] & 31];
    for (var i2 = 0;i2 < lcdt.length; ++i2)
      ++lcfreq[lcdt[i2] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (;nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
      ;
    var flen = bl + 5 << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
      return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
      lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
      var llm = hMap(lct, mlcb, 0);
      wbits(out, p, nlc - 257);
      wbits(out, p + 5, ndc - 1);
      wbits(out, p + 10, nlcc - 4);
      p += 14;
      for (var i2 = 0;i2 < nlcc; ++i2)
        wbits(out, p + 3 * i2, lct[clim[i2]]);
      p += 3 * nlcc;
      var lcts = [lclt, lcdt];
      for (var it = 0;it < 2; ++it) {
        var clct = lcts[it];
        for (var i2 = 0;i2 < clct.length; ++i2) {
          var len = clct[i2] & 31;
          wbits(out, p, llm[len]), p += lct[len];
          if (len > 15)
            wbits(out, p, clct[i2] >> 5 & 127), p += clct[i2] >> 12;
        }
      }
    } else {
      lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i2 = 0;i2 < li; ++i2) {
      var sym = syms[i2];
      if (sym > 255) {
        var len = sym >> 18 & 31;
        wbits16(out, p, lm[len + 257]), p += ll[len + 257];
        if (len > 7)
          wbits(out, p, sym >> 23 & 31), p += fleb[len];
        var dst = sym & 31;
        wbits16(out, p, dm[dst]), p += dl[dst];
        if (dst > 3)
          wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
      } else {
        wbits16(out, p, lm[sym]), p += ll[sym];
      }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
  };
  var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  var et = /* @__PURE__ */ new u8(0);
  var dflt = function(dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
      if (pos)
        w[0] = st.r >> 3;
      var opt = deo[lvl - 1];
      var n = opt >> 13, c = opt & 8191;
      var msk_1 = (1 << plvl) - 1;
      var prev = st.p || new u16(32768), head2 = st.h || new u16(msk_1 + 1);
      var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
      var hsh = function(i3) {
        return (dat[i3] ^ dat[i3 + 1] << bs1_1 ^ dat[i3 + 2] << bs2_1) & msk_1;
      };
      var syms = new i32(25000);
      var lf = new u16(288), df = new u16(32);
      var lc_1 = 0, eb = 0, i2 = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
      for (;i2 + 2 < s; ++i2) {
        var hv = hsh(i2);
        var imod = i2 & 32767, pimod = head2[hv];
        prev[imod] = pimod;
        head2[hv] = imod;
        if (wi <= i2) {
          var rem = s - i2;
          if ((lc_1 > 7000 || li > 24576) && (rem > 423 || !lst)) {
            pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i2 - bs, pos);
            li = lc_1 = eb = 0, bs = i2;
            for (var j = 0;j < 286; ++j)
              lf[j] = 0;
            for (var j = 0;j < 30; ++j)
              df[j] = 0;
          }
          var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
          if (rem > 2 && hv == hsh(i2 - dif)) {
            var maxn = Math.min(n, rem) - 1;
            var maxd = Math.min(32767, i2);
            var ml = Math.min(258, rem);
            while (dif <= maxd && --ch_1 && imod != pimod) {
              if (dat[i2 + l] == dat[i2 + l - dif]) {
                var nl = 0;
                for (;nl < ml && dat[i2 + nl] == dat[i2 + nl - dif]; ++nl)
                  ;
                if (nl > l) {
                  l = nl, d = dif;
                  if (nl > maxn)
                    break;
                  var mmd = Math.min(dif, nl - 2);
                  var md = 0;
                  for (var j = 0;j < mmd; ++j) {
                    var ti = i2 - dif + j & 32767;
                    var pti = prev[ti];
                    var cd = ti - pti & 32767;
                    if (cd > md)
                      md = cd, pimod = ti;
                  }
                }
              }
              imod = pimod, pimod = prev[imod];
              dif += imod - pimod & 32767;
            }
          }
          if (d) {
            syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
            var lin = revfl[l] & 31, din = revfd[d] & 31;
            eb += fleb[lin] + fdeb[din];
            ++lf[257 + lin];
            ++df[din];
            wi = i2 + l;
            ++lc_1;
          } else {
            syms[li++] = dat[i2];
            ++lf[dat[i2]];
          }
        }
      }
      for (i2 = Math.max(i2, wi);i2 < s; ++i2) {
        syms[li++] = dat[i2];
        ++lf[dat[i2]];
      }
      pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i2 - bs, pos);
      if (!lst) {
        st.r = pos & 7 | w[pos / 8 | 0] << 3;
        pos -= 7;
        st.h = head2, st.p = prev, st.i = i2, st.w = wi;
      }
    } else {
      for (var i2 = st.w || 0;i2 < s + lst; i2 += 65535) {
        var e = i2 + 65535;
        if (e >= s) {
          w[pos / 8 | 0] = lst;
          e = s;
        }
        pos = wfblk(w, pos + 1, dat.subarray(i2, e));
      }
      st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
  };
  var dopt = function(dat, opt, pre, post, st) {
    if (!st) {
      st = { l: 1 };
      if (opt.dictionary) {
        var dict = opt.dictionary.subarray(-32768);
        var newDat = new u8(dict.length + dat.length);
        newDat.set(dict);
        newDat.set(dat, dict.length);
        dat = newDat;
        st.w = dict.length;
      }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
  };
  function deflateSync(data, opts) {
    return dopt(data, opts || {}, 0, 0);
  }
  var te = typeof TextEncoder != "undefined" && /* @__PURE__ */ new TextEncoder;
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder;
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {}
  function strToU8(str, latin1) {
    if (latin1) {
      var ar_1 = new u8(str.length);
      for (var i2 = 0;i2 < str.length; ++i2)
        ar_1[i2] = str.charCodeAt(i2);
      return ar_1;
    }
    if (te)
      return te.encode(str);
    var l = str.length;
    var ar = new u8(str.length + (str.length >> 1));
    var ai = 0;
    var w = function(v) {
      ar[ai++] = v;
    };
    for (var i2 = 0;i2 < l; ++i2) {
      if (ai + 5 > ar.length) {
        var n = new u8(ai + 8 + (l - i2 << 1));
        n.set(ar);
        ar = n;
      }
      var c = str.charCodeAt(i2);
      if (c < 128 || latin1)
        w(c);
      else if (c < 2048)
        w(192 | c >> 6), w(128 | c & 63);
      else if (c > 55295 && c < 57344)
        c = 65536 + (c & 1023 << 10) | str.charCodeAt(++i2) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
      else
        w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
    }
    return slc(ar, 0, ai);
  }

  // ../../node_modules/.bun/js-base64@3.9.3/node_modules/js-base64/base64.mjs
  var _TD = typeof TextDecoder === "function" ? new TextDecoder("utf-8", { ignoreBOM: true }) : undefined;
  var _TE = typeof TextEncoder === "function" ? new TextEncoder : undefined;
  var b64ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var b64chs = Array.prototype.slice.call(b64ch);
  var b64tab = ((a) => {
    let tab = {};
    a.forEach((c, i2) => tab[c] = i2);
    return tab;
  })(b64chs);
  var b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
  var _fromCC = String.fromCharCode.bind(String);
  var _U8Afrom = typeof Uint8Array.from === "function" ? Uint8Array.from.bind(Uint8Array) : (it) => new Uint8Array(Array.prototype.slice.call(it, 0));
  var _mkUriSafe = (src) => src.replace(/=/g, "").replace(/[+\/]/g, (m0) => m0 == "+" ? "-" : "_");
  var _tidyB64 = (s) => s.replace(/[^A-Za-z0-9\+\/]/g, "");
  var btoaPolyfill = (bin) => {
    let u32, c0, c1, c2, asc = "";
    const pad2 = bin.length % 3;
    for (let i2 = 0;i2 < bin.length; ) {
      if ((c0 = bin.charCodeAt(i2++)) > 255 || (c1 = bin.charCodeAt(i2++)) > 255 || (c2 = bin.charCodeAt(i2++)) > 255)
        throw new TypeError("invalid character found");
      u32 = c0 << 16 | c1 << 8 | c2;
      asc += b64chs[u32 >> 18 & 63] + b64chs[u32 >> 12 & 63] + b64chs[u32 >> 6 & 63] + b64chs[u32 & 63];
    }
    return pad2 ? asc.slice(0, pad2 - 3) + "===".substring(pad2) : asc;
  };
  var _btoa = typeof btoa === "function" ? (bin) => btoa(bin) : btoaPolyfill;
  var _fromUint8Array = typeof Uint8Array.prototype.toBase64 === "function" ? (u8a) => u8a.toBase64() : (u8a) => {
    const maxargs = 4096;
    let strs = [];
    for (let i2 = 0, l = u8a.length;i2 < l; i2 += maxargs) {
      strs.push(_fromCC.apply(null, u8a.subarray(i2, i2 + maxargs)));
    }
    return _btoa(strs.join(""));
  };
  var fromUint8Array = (u8a, urlsafe = false) => urlsafe ? _mkUriSafe(_fromUint8Array(u8a)) : _fromUint8Array(u8a);
  var atobPolyfill = (asc) => {
    asc = asc.replace(/\s+/g, "");
    if (!b64re.test(asc))
      throw new TypeError("malformed base64.");
    asc += "==".slice(2 - (asc.length & 3));
    let u24, r1, r2;
    let binArray = [];
    for (let i2 = 0;i2 < asc.length; ) {
      u24 = b64tab[asc.charAt(i2++)] << 18 | b64tab[asc.charAt(i2++)] << 12 | (r1 = b64tab[asc.charAt(i2++)]) << 6 | (r2 = b64tab[asc.charAt(i2++)]);
      if (r1 === 64) {
        binArray.push(_fromCC(u24 >> 16 & 255));
      } else if (r2 === 64) {
        binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255));
      } else {
        binArray.push(_fromCC(u24 >> 16 & 255, u24 >> 8 & 255, u24 & 255));
      }
    }
    return binArray.join("");
  };
  var _atob = typeof atob === "function" ? (asc) => atob(_tidyB64(asc)) : atobPolyfill;
  var _toUint8Array = typeof Uint8Array.fromBase64 === "function" ? (a) => Uint8Array.fromBase64(a) : (a) => _U8Afrom(_atob(a).split("").map((c) => c.charCodeAt(0)));

  // ../../node_modules/.bun/entities@8.0.0/node_modules/entities/dist/escape.js
  var xmlCodeMap = new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [39, "&apos;"],
    [60, "&lt;"],
    [62, "&gt;"]
  ]);
  var getCodePoint = typeof String.prototype.codePointAt === "function" ? (input, index) => input.codePointAt(index) : (c, index) => (c.charCodeAt(index) & 64512) === 55296 ? (c.charCodeAt(index) - 55296) * 1024 + c.charCodeAt(index + 1) - 56320 + 65536 : c.charCodeAt(index);
  function getEscaper(regex, map) {
    return function escape2(data) {
      let match;
      let lastIndex = 0;
      let result = "";
      while (match = regex.exec(data)) {
        if (lastIndex !== match.index) {
          result += data.substring(lastIndex, match.index);
        }
        result += map.get(match[0].charCodeAt(0));
        lastIndex = match.index + 1;
      }
      return result + data.substring(lastIndex);
    };
  }
  var escapeAttribute = /* @__PURE__ */ getEscaper(/["&\u00A0]/g, new Map([
    [34, "&quot;"],
    [38, "&amp;"],
    [160, "&nbsp;"]
  ]));
  var escapeText = /* @__PURE__ */ getEscaper(/[&<>\u00A0]/g, new Map([
    [38, "&amp;"],
    [60, "&lt;"],
    [62, "&gt;"],
    [160, "&nbsp;"]
  ]));

  // ../../node_modules/.bun/entities@8.0.0/node_modules/entities/dist/index.js
  var EntityLevel;
  (function(EntityLevel2) {
    EntityLevel2[EntityLevel2["XML"] = 0] = "XML";
    EntityLevel2[EntityLevel2["HTML"] = 1] = "HTML";
  })(EntityLevel || (EntityLevel = {}));
  var EncodingMode;
  (function(EncodingMode2) {
    EncodingMode2[EncodingMode2["UTF8"] = 0] = "UTF8";
    EncodingMode2[EncodingMode2["ASCII"] = 1] = "ASCII";
    EncodingMode2[EncodingMode2["Extensive"] = 2] = "Extensive";
    EncodingMode2[EncodingMode2["Attribute"] = 3] = "Attribute";
    EncodingMode2[EncodingMode2["Text"] = 4] = "Text";
  })(EncodingMode || (EncodingMode = {}));

  // src/record.ts
  function ownValue(record, key) {
    return Object.hasOwn(record, key) ? record[key] : undefined;
  }

  // src/html.ts
  var VOID_TAGS = new Set(["area", "br", "col", "hr", "img", "input", "source", "wbr"]);
  function styleAttribute(style) {
    return Object.entries(style).map(([property, value]) => `${property}: ${value}`).join("; ");
  }
  function attributes(element, options) {
    const attrs = { ...element.attrs };
    if (options.images === false && ownValue(attrs, "src")?.startsWith("data:"))
      delete attrs.src;
    const style = styleAttribute(element.computedStyle);
    if (style)
      attrs.style = style;
    return Object.entries(attrs).map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`).join("");
  }
  function serialize(node, options) {
    if (node.type === "text")
      return escapeText(node.text);
    const open = `<${node.tagName}${attributes(node, options)}>`;
    if (VOID_TAGS.has(node.tagName))
      return open;
    const children = node.children.map((child) => serialize(child, options)).join("");
    return `${open}${children}</${node.tagName}>`;
  }
  function webCaptureToHTML(capture, options = {}) {
    return serialize(capture.root, options);
  }

  // src/limits.ts
  var WEB_CAPTURE_FORMAT = "pairdraw/web-capture";
  var WEB_CAPTURE_VERSION = 1;
  var MAX_CAPTURE_ELEMENTS = 20000;
  var MAX_CAPTURE_DEPTH = 256;
  var MAX_CAPTURE_IMAGE_BYTES = 8 * 1024 * 1024;
  var MAX_CAPTURE_IMAGES_BYTES = 48 * 1024 * 1024;
  var MAX_CAPTURE_JSON_LENGTH = 96 * 1024 * 1024;
  var MAX_WEB_HTML_LENGTH = 8 * 1024 * 1024;

  // ../../node_modules/.bun/valibot@1.5.0+3d27f1aed1730eeb/node_modules/valibot/dist/index.mjs
  var store$4;
  var DEFAULT_CONFIG = {
    lang: undefined,
    message: undefined,
    abortEarly: undefined,
    abortPipeEarly: undefined
  };
  function getGlobalConfig(config$1) {
    if (!config$1 && !store$4)
      return DEFAULT_CONFIG;
    return {
      lang: config$1?.lang ?? store$4?.lang,
      message: config$1?.message,
      abortEarly: config$1?.abortEarly ?? store$4?.abortEarly,
      abortPipeEarly: config$1?.abortPipeEarly ?? store$4?.abortPipeEarly
    };
  }
  var store$3;
  function getGlobalMessage(lang) {
    return store$3?.get(lang);
  }
  var store$2;
  function getSchemaMessage(lang) {
    return store$2?.get(lang);
  }
  var store$1;
  function getSpecificMessage(reference, lang) {
    return store$1?.get(reference)?.get(lang);
  }
  function _stringify(input) {
    const type = typeof input;
    if (type === "string")
      return `"${input}"`;
    if (type === "number" || type === "bigint" || type === "boolean")
      return `${input}`;
    if (type === "object" || type === "function")
      return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
    return type;
  }
  function _addIssue(context, label, dataset, config$1, other) {
    const input = other && "input" in other ? other.input : dataset.value;
    const expected = other?.expected ?? context.expects ?? null;
    const received = other?.received ?? /* @__PURE__ */ _stringify(input);
    const issue = {
      kind: context.kind,
      type: context.type,
      input,
      expected,
      received,
      message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
      requirement: context.requirement,
      path: other?.path,
      issues: other?.issues,
      lang: config$1.lang,
      abortEarly: config$1.abortEarly,
      abortPipeEarly: config$1.abortPipeEarly
    };
    const isSchema = context.kind === "schema";
    const message$1 = other?.message ?? context.message ?? /* @__PURE__ */ getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? /* @__PURE__ */ getSchemaMessage(issue.lang) : null) ?? config$1.message ?? /* @__PURE__ */ getGlobalMessage(issue.lang);
    if (message$1 !== undefined)
      issue.message = typeof message$1 === "function" ? message$1(issue) : message$1;
    if (isSchema)
      dataset.typed = false;
    if (dataset.issues)
      dataset.issues.push(issue);
    else
      dataset.issues = [issue];
  }
  function _isSameValueZero(value1, value2) {
    return value1 === value2 || Number.isNaN(value1) && Number.isNaN(value2);
  }
  function _isValidObjectKey(object$1, key) {
    return Object.prototype.hasOwnProperty.call(object$1, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
  }
  function _standardSchema(schema) {
    schema["~standard"] = {
      version: 1,
      vendor: "valibot",
      validate: (value$1) => schema["~run"]({ value: value$1 }, /* @__PURE__ */ getGlobalConfig())
    };
    return schema;
  }
  function getFallback(schema, dataset, config$1) {
    return typeof schema.fallback === "function" ? schema.fallback(dataset, config$1) : schema.fallback;
  }
  function getDefault(schema, dataset, config$1) {
    return typeof schema.default === "function" ? schema.default(dataset, config$1) : schema.default;
  }
  function literal(literal_, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "literal",
      reference: literal,
      expects: /* @__PURE__ */ _stringify(literal_),
      async: false,
      literal: literal_,
      message: message$1,
      "~run"(dataset, config$1) {
        if (/* @__PURE__ */ _isSameValueZero(dataset.value, this.literal))
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function looseObject(entries$1, message$1) {
    return _standardSchema({
      kind: "schema",
      type: "loose_object",
      reference: looseObject,
      expects: "Object",
      async: false,
      entries: entries$1,
      message: message$1,
      "~run"(dataset, config$1) {
        const input = dataset.value;
        if (input && typeof input === "object") {
          dataset.typed = true;
          dataset.value = {};
          for (const key in this.entries) {
            const valueSchema = this.entries[key];
            if (key in input || (valueSchema.type === "exact_optional" || valueSchema.type === "optional" || valueSchema.type === "nullish") && valueSchema.default !== undefined) {
              const value$1 = key in input ? input[key] : /* @__PURE__ */ getDefault(valueSchema);
              const valueDataset = valueSchema["~run"]({ value: value$1 }, config$1);
              if (valueDataset.issues) {
                const pathItem = {
                  type: "object",
                  origin: "value",
                  input,
                  key,
                  value: value$1
                };
                for (const issue of valueDataset.issues) {
                  if (issue.path)
                    issue.path.unshift(pathItem);
                  else
                    issue.path = [pathItem];
                  dataset.issues?.push(issue);
                }
                if (!dataset.issues)
                  dataset.issues = valueDataset.issues;
                if (config$1.abortEarly) {
                  dataset.typed = false;
                  break;
                }
              }
              if (!valueDataset.typed)
                dataset.typed = false;
              dataset.value[key] = valueDataset.value;
            } else if (valueSchema.fallback !== undefined)
              dataset.value[key] = /* @__PURE__ */ getFallback(valueSchema);
            else if (valueSchema.type !== "exact_optional" && valueSchema.type !== "optional" && valueSchema.type !== "nullish") {
              _addIssue(this, "key", dataset, config$1, {
                input: undefined,
                expected: `"${key}"`,
                path: [{
                  type: "object",
                  origin: "key",
                  input,
                  key,
                  value: input[key]
                }]
              });
              if (config$1.abortEarly)
                break;
            }
          }
          if (!dataset.issues || !config$1.abortEarly) {
            for (const key in input)
              if (/* @__PURE__ */ _isValidObjectKey(input, key) && !Object.prototype.hasOwnProperty.call(this.entries, key))
                dataset.value[key] = input[key];
          }
        } else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }
  function number(message$1) {
    return _standardSchema({
      kind: "schema",
      type: "number",
      reference: number,
      expects: "number",
      async: false,
      message: message$1,
      "~run"(dataset, config$1) {
        if (typeof dataset.value === "number" && !isNaN(dataset.value))
          dataset.typed = true;
        else
          _addIssue(this, "type", dataset, config$1);
        return dataset;
      }
    });
  }

  // src/styles.ts
  var CAPTURED_STYLE_PROPERTIES = [
    "align-items",
    "align-self",
    "aspect-ratio",
    "background-color",
    "border-bottom-color",
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "border-bottom-style",
    "border-bottom-width",
    "border-left-color",
    "border-left-style",
    "border-left-width",
    "border-right-color",
    "border-right-style",
    "border-right-width",
    "border-top-color",
    "border-top-left-radius",
    "border-top-right-radius",
    "border-top-style",
    "border-top-width",
    "bottom",
    "box-shadow",
    "box-sizing",
    "color",
    "column-gap",
    "display",
    "flex-direction",
    "flex-wrap",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "gap",
    "height",
    "justify-content",
    "left",
    "letter-spacing",
    "line-height",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "margin-top",
    "max-height",
    "max-width",
    "min-height",
    "min-width",
    "object-fit",
    "opacity",
    "overflow",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "padding-top",
    "position",
    "right",
    "row-gap",
    "text-align",
    "text-decoration-color",
    "text-decoration-line",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-indent",
    "text-shadow",
    "text-transform",
    "text-underline-offset",
    "top",
    "white-space",
    "width"
  ];
  var CAPTURED = new Set(CAPTURED_STYLE_PROPERTIES);
  function isCapturedStyleProperty(property) {
    return CAPTURED.has(property);
  }
  var SIDES = ["top", "right", "bottom", "left"];
  var IMPLIED_VALUES = {
    "align-items": ["normal"],
    "align-self": ["auto"],
    "aspect-ratio": ["auto"],
    "background-color": ["rgba(0, 0, 0, 0)", "transparent"],
    "box-shadow": ["none"],
    "column-gap": ["normal"],
    "flex-direction": ["row"],
    "flex-wrap": ["nowrap"],
    gap: ["normal"],
    height: ["auto"],
    "justify-content": ["normal"],
    "max-height": ["none"],
    "max-width": ["none"],
    "min-height": ["auto", "0px"],
    "min-width": ["auto", "0px"],
    "object-fit": ["fill"],
    opacity: ["1"],
    overflow: ["visible"],
    "row-gap": ["normal"],
    "text-indent": ["0px"],
    width: ["auto"]
  };
  var ZERO_LENGTH_PROPERTIES = [
    "border-bottom-left-radius",
    "border-bottom-right-radius",
    "border-top-left-radius",
    "border-top-right-radius",
    ...SIDES.map((side) => `padding-${side}`),
    ...SIDES.map((side) => `margin-${side}`)
  ];
  var TEXT_DECORATION_DETAILS = [
    "text-decoration-color",
    "text-decoration-style",
    "text-decoration-thickness",
    "text-underline-offset"
  ];
  function withoutImpliedValues(style) {
    const dropped = new Set;
    for (const [property, values] of Object.entries(IMPLIED_VALUES)) {
      if (values.includes(ownValue(style, property) ?? ""))
        dropped.add(property);
    }
    for (const property of ZERO_LENGTH_PROPERTIES) {
      if (style[property] === "0px")
        dropped.add(property);
    }
    for (const side of SIDES) {
      const borderStyle = ownValue(style, `border-${side}-style`);
      if (borderStyle !== undefined && borderStyle !== "none" && borderStyle !== "hidden")
        continue;
      for (const part of ["style", "width", "color"])
        dropped.add(`border-${side}-${part}`);
    }
    const position = ownValue(style, "position");
    const inFlow = position === undefined || position === "static" || position === "sticky";
    if (inFlow)
      dropped.add("position");
    for (const side of SIDES) {
      if (inFlow || style[side] === "auto")
        dropped.add(side);
    }
    const decoration = ownValue(style, "text-decoration-line");
    if (decoration === undefined || decoration === "none") {
      for (const property of TEXT_DECORATION_DETAILS)
        dropped.add(property);
    }
    return Object.fromEntries(Object.entries(style).filter(([property]) => !dropped.has(property)));
  }

  // src/urls.ts
  var LINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);
  var IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
  var DATA_IMAGE = /^data:image\/(?:png|jpeg|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon);base64,/i;
  function resolve(value, base) {
    try {
      return new URL(value.trim(), base);
    } catch {
      return null;
    }
  }
  function safeLinkURL(value, base) {
    const url = resolve(value, base);
    return url && LINK_PROTOCOLS.has(url.protocol) ? url.href : null;
  }
  function safeImageSource(value, base) {
    const trimmed = value.trim();
    if (DATA_IMAGE.test(trimmed))
      return trimmed;
    const url = resolve(trimmed, base);
    return url && IMAGE_PROTOCOLS.has(url.protocol) ? url.href : null;
  }

  // src/parse.ts
  var captureHeaderSchema = looseObject({
    format: literal(WEB_CAPTURE_FORMAT),
    version: number()
  });
  var KEPT_ATTRIBUTES = new Set([
    "id",
    "class",
    "href",
    "src",
    "alt",
    "title",
    "role",
    "aria-label",
    "lang",
    "dir"
  ]);
  var DROPPED_TAGS = new Set([
    "script",
    "style",
    "link",
    "meta",
    "head",
    "title",
    "template",
    "noscript",
    "iframe",
    "frame",
    "object",
    "embed",
    "base"
  ]);
  var MAX_JSON_NESTING = 2 * MAX_CAPTURE_DEPTH + 16;
  function keptAttributes(attrs, base) {
    const kept = {};
    for (const [name, value] of Object.entries(attrs)) {
      if (!KEPT_ATTRIBUTES.has(name))
        continue;
      if (name === "href") {
        const href = safeLinkURL(value, base);
        if (href)
          kept.href = href;
      } else if (name === "src") {
        const src = safeImageSource(value, base);
        if (src)
          kept.src = src;
      } else {
        kept[name] = value;
      }
    }
    return kept;
  }
  function keptStyle(style) {
    return Object.fromEntries(Object.entries(style).filter(([property]) => isCapturedStyleProperty(property)));
  }
  function normalizeElement(element, base, depth, budget) {
    const children = [];
    for (const child of element.children) {
      if (child.type === "text") {
        children.push(child);
        continue;
      }
      if (DROPPED_TAGS.has(child.tagName))
        continue;
      if (depth + 1 > MAX_CAPTURE_DEPTH || budget.elements >= MAX_CAPTURE_ELEMENTS) {
        budget.truncated = true;
        continue;
      }
      budget.elements++;
      children.push(normalizeElement(child, base, depth + 1, budget));
    }
    return {
      type: "element",
      tagName: element.tagName,
      attrs: keptAttributes(element.attrs, base),
      computedStyle: keptStyle(element.computedStyle),
      ...element.box ? { box: element.box } : {},
      children
    };
  }
  function normalizeWebCapture(capture) {
    const budget = { elements: 1, truncated: false };
    const base = capture.source.url;
    const root = normalizeElement(capture.root, base, 0, budget);
    return { ...capture, root, truncated: capture.truncated || budget.truncated };
  }

  // src/clipboard.ts
  var WEB_CAPTURE_CLIPBOARD_START = "<!--(pairdraw-web-capture)";
  var WEB_CAPTURE_CLIPBOARD_END = "(/pairdraw-web-capture)-->";
  var INFLATE_STEP = 16 * 1024;
  function encodeWebCaptureClipboard(captured) {
    const capture = normalizeWebCapture(captured);
    const compressed = deflateSync(strToU8(JSON.stringify(capture)), { level: 6 });
    const marker = `${WEB_CAPTURE_CLIPBOARD_START}${fromUint8Array(compressed)}${WEB_CAPTURE_CLIPBOARD_END}`;
    const html = `<meta charset="utf-8">${marker}${webCaptureToHTML(capture, { images: false })}`;
    const text = compact([capture.source.title, capture.source.url]).join(`
`);
    return { html, text };
  }

  // src/capturer/fonts.ts
  function primaryFontFamily(fontFamily) {
    const first = fontFamily.split(",")[0] ?? "";
    return first.trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  function createFontCollector() {
    const fonts = new Map;
    return {
      add(style) {
        const family = primaryFontFamily(style.getPropertyValue("font-family"));
        if (!family)
          return;
        const font = {
          family,
          weight: style.getPropertyValue("font-weight") || "400",
          style: style.getPropertyValue("font-style") || "normal"
        };
        fonts.set(`${font.family}|${font.weight}|${font.style}`, font);
      },
      list: () => [...fonts.values()]
    };
  }

  // src/capturer/images.ts
  var RASTER_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/bmp",
    "image/x-icon",
    "image/vnd.microsoft.icon"
  ]);
  var MAX_RASTER_SCALE = 2;
  var CONCURRENT_FETCHES = 6;
  function createLimiter(limit) {
    let active = 0;
    const waiting = [];
    return async (task) => {
      if (active >= limit) {
        await new Promise((resolve2) => {
          waiting.push(resolve2);
        });
      }
      active++;
      try {
        return await task();
      } finally {
        active--;
        waiting.shift()?.();
      }
    };
  }
  function createImageInliner(view, options = {}) {
    const maxImageBytes = options.maxImageBytes ?? MAX_CAPTURE_IMAGE_BYTES;
    const maxTotalBytes = options.maxTotalBytes ?? MAX_CAPTURE_IMAGES_BYTES;
    const cache = new Map;
    const limit = createLimiter(CONCURRENT_FETCHES);
    let totalBytes = 0;
    function reserve(bytes) {
      if (bytes > maxImageBytes || totalBytes + bytes > maxTotalBytes)
        return false;
      totalBytes += bytes;
      return true;
    }
    function accept(dataURL) {
      return reserve(Math.ceil(dataURL.length * 3 / 4)) ? dataURL : null;
    }
    async function rasterize(blob, size) {
      const url = view.URL.createObjectURL(blob);
      try {
        const image = new view.Image;
        image.src = url;
        await image.decode();
        const width = size?.width || image.naturalWidth;
        const height = size?.height || image.naturalHeight;
        if (!width || !height)
          return null;
        const scale = Math.min(view.devicePixelRatio || 1, MAX_RASTER_SCALE);
        const canvas = view.document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context)
          return null;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return accept(canvas.toDataURL("image/png"));
      } catch {
        return null;
      } finally {
        view.URL.revokeObjectURL(url);
      }
    }
    async function fromBlob(blob, size) {
      if (blob.size > maxImageBytes)
        return null;
      const type = blob.type.toLowerCase();
      if (!RASTER_TYPES.has(type))
        return rasterize(blob, size);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (!reserve(bytes.length))
        return null;
      return `data:${type};base64,${fromUint8Array(bytes)}`;
    }
    async function fetchBlob(url) {
      const response = await view.fetch(url, { credentials: "same-origin", signal: options.signal }).catch(() => null);
      if (response?.ok)
        return response.blob();
      if (!options.fetchImage || url.startsWith("data:"))
        return null;
      return options.fetchImage(url).catch(() => null);
    }
    function inline(url, size) {
      const key = size ? `${url}#${size.width}x${size.height}` : url;
      const cached = cache.get(key);
      if (cached)
        return cached;
      const task = limit(async () => {
        options.signal?.throwIfAborted();
        const blob = await fetchBlob(url);
        return blob ? fromBlob(blob, size) : null;
      }).catch(() => null);
      cache.set(key, task);
      return task;
    }
    function rasterizeSVG(markup, size) {
      return rasterize(new view.Blob([markup], { type: "image/svg+xml" }), size);
    }
    return { inline, rasterizeSVG, accept };
  }

  // src/capturer/svg.ts
  var PRESENTATION_PROPERTIES = [
    "fill",
    "fill-opacity",
    "fill-rule",
    "stroke",
    "stroke-width",
    "stroke-opacity",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-dasharray",
    "opacity",
    "color",
    "font-family",
    "font-size",
    "font-weight",
    "display",
    "visibility"
  ];
  var MAX_STYLED_ELEMENTS = 4000;
  var SVG_NAMESPACE = "http://www.w3.org/2000/svg";
  function inlineStyles(view, original, copy) {
    const style = view.getComputedStyle(original);
    const declarations = PRESENTATION_PROPERTIES.flatMap((property) => {
      const value = style.getPropertyValue(property);
      return value ? [`${property}:${value}`] : [];
    });
    if (declarations.length > 0)
      copy.setAttribute("style", declarations.join(";"));
  }
  function referencedSymbols(svg, document2) {
    const symbols = new Set;
    for (const use of svg.querySelectorAll("use")) {
      const reference = use.getAttribute("href") ?? use.getAttribute("xlink:href") ?? "";
      if (!reference.startsWith("#"))
        continue;
      const target = document2.getElementById(reference.slice(1));
      if (target && !svg.contains(target))
        symbols.add(target);
    }
    return [...symbols];
  }
  function standaloneSVGMarkup(view, svg, size) {
    const copy = svg.cloneNode(true);
    if (!(copy instanceof view.SVGSVGElement))
      return "";
    const originals = [svg, ...svg.querySelectorAll("*")];
    const copies = [copy, ...copy.querySelectorAll("*")];
    for (const [index, original] of originals.slice(0, MAX_STYLED_ELEMENTS).entries()) {
      const target = copies.at(index);
      if (target)
        inlineStyles(view, original, target);
    }
    const symbols = referencedSymbols(svg, svg.ownerDocument);
    if (symbols.length > 0) {
      const defs = svg.ownerDocument.createElementNS(SVG_NAMESPACE, "defs");
      for (const symbol of symbols)
        defs.append(symbol.cloneNode(true));
      copy.prepend(defs);
    }
    copy.setAttribute("xmlns", SVG_NAMESPACE);
    copy.setAttribute("width", String(size.width));
    copy.setAttribute("height", String(size.height));
    return new view.XMLSerializer().serializeToString(copy);
  }

  // src/capturer/walk.ts
  var SKIPPED_TAGS = new Set([
    "script",
    "style",
    "link",
    "meta",
    "head",
    "title",
    "template",
    "noscript",
    "base",
    "iframe",
    "frame",
    "object",
    "embed",
    "source",
    "track",
    "param"
  ]);
  var KEPT_ATTRIBUTES2 = ["id", "class", "alt", "title", "role", "aria-label", "lang", "dir"];
  var TEXT_INPUT_TYPES = new Set([
    "",
    "text",
    "email",
    "search",
    "url",
    "tel",
    "number",
    "password"
  ]);
  var BACKGROUND_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/;
  function boxOf(element, origin) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - origin.x,
      y: rect.top - origin.y,
      width: rect.width,
      height: rect.height
    };
  }
  function attributesOf(element, view) {
    const attrs = {};
    for (const name of KEPT_ATTRIBUTES2) {
      const value = element.getAttribute(name);
      if (value !== null && value !== "")
        attrs[name] = value;
    }
    if (element instanceof view.HTMLAnchorElement && element.hasAttribute("href") && element.href) {
      attrs.href = element.href;
    }
    return attrs;
  }
  function readStyle(style) {
    const computed = {};
    for (const property of CAPTURED_STYLE_PROPERTIES) {
      const value = style.getPropertyValue(property);
      if (value)
        computed[property] = value;
    }
    const visibility = style.getPropertyValue("visibility");
    if (visibility === "hidden" || visibility === "collapse")
      computed.opacity = "0";
    return withoutImpliedValues(computed);
  }
  function hasDirectText(element) {
    return [...element.childNodes].some((child) => child.nodeType === 3 && (child.textContent ?? "").trim().length > 0);
  }
  function renderedChildren(element, view) {
    const source = element.shadowRoot ? element.shadowRoot.childNodes : element.childNodes;
    return [...source].flatMap((child) => {
      if (child instanceof view.HTMLSlotElement) {
        const assigned = child.assignedNodes({ flatten: true });
        return assigned.length > 0 ? assigned : [...child.childNodes];
      }
      return [child];
    });
  }
  function controlText(element, view) {
    if (element instanceof view.HTMLTextAreaElement) {
      return element.value || element.placeholder || null;
    }
    if (element instanceof view.HTMLSelectElement) {
      return element.selectedOptions.item(0)?.text ?? null;
    }
    if (element instanceof view.HTMLInputElement) {
      if (!TEXT_INPUT_TYPES.has(element.type)) {
        return element.type === "button" || element.type === "submit" ? element.value : null;
      }
      if (element.type === "password" && element.value)
        return "•".repeat(element.value.length);
      return element.value || element.placeholder || null;
    }
    return null;
  }
  function inlineSource(context, node, read) {
    context.pending.push(read().then((source) => {
      if (source)
        node.attrs.src = source;
      return;
    }));
  }
  function imageSize(box) {
    return { width: Math.round(box.width), height: Math.round(box.height) };
  }
  function canvasDataURL(canvas) {
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  }
  function captureReplaced(element, node, context) {
    const { view } = context;
    const box = node.box ?? { x: 0, y: 0, width: 0, height: 0 };
    if (element instanceof view.SVGSVGElement) {
      node.tagName = "img";
      if (box.width > 0 && box.height > 0) {
        const markup = standaloneSVGMarkup(view, element, imageSize(box));
        inlineSource(context, node, () => context.images.rasterizeSVG(markup, imageSize(box)));
      }
      return true;
    }
    if (element instanceof view.HTMLImageElement) {
      const source = element.currentSrc || element.src;
      if (source) {
        node.attrs.src = source;
        inlineSource(context, node, () => context.images.inline(source, imageSize(box)));
      }
      return true;
    }
    if (element instanceof view.HTMLCanvasElement) {
      node.tagName = "img";
      const drawn = canvasDataURL(element);
      const source = drawn && context.images.accept(drawn);
      if (source)
        node.attrs.src = source;
      return true;
    }
    if (element instanceof view.HTMLVideoElement) {
      node.tagName = "img";
      const poster = element.poster;
      if (poster)
        inlineSource(context, node, () => context.images.inline(poster, imageSize(box)));
      return true;
    }
    const text = controlText(element, view);
    if (text !== null) {
      node.children = [{ type: "text", text }];
      return true;
    }
    return false;
  }
  function captureBackground(style, node, context) {
    const match = BACKGROUND_URL.exec(style.getPropertyValue("background-image"));
    const url = match?.[2];
    const box = node.box;
    if (!url || !box || box.width <= 0 || box.height <= 0)
      return;
    const fit = style.getPropertyValue("background-size") === "contain" ? "contain" : "cover";
    if (node.tagName !== "img" && node.children.length === 0) {
      node.tagName = "img";
      node.computedStyle["object-fit"] = fit;
      inlineSource(context, node, () => context.images.inline(url));
      return;
    }
    if (node.tagName === "img")
      return;
    const radii = Object.fromEntries(Object.entries(node.computedStyle).filter(([property]) => property.endsWith("-radius")));
    const image = {
      type: "element",
      tagName: "img",
      attrs: {},
      computedStyle: {
        ...radii,
        display: "block",
        position: "absolute",
        left: "0px",
        top: "0px",
        width: `${box.width}px`,
        height: `${box.height}px`,
        "object-fit": fit
      },
      box,
      children: []
    };
    inlineSource(context, image, () => context.images.inline(url));
    node.children.unshift(image);
  }
  function captureChildren(element, context, depth) {
    return renderedChildren(element, context.view).flatMap((child) => {
      if (child.nodeType === 3) {
        const text = child.textContent ?? "";
        return text.length > 0 ? [{ type: "text", text }] : [];
      }
      return child instanceof context.view.Element ? walkElement(child, context, depth + 1) : [];
    });
  }
  function walkElement(element, context, depth = 0) {
    const tagName = element.localName.toLowerCase();
    if (SKIPPED_TAGS.has(tagName))
      return [];
    const style = context.view.getComputedStyle(element);
    const display = style.getPropertyValue("display");
    if (display === "none")
      return [];
    if (display === "contents")
      return captureChildren(element, context, depth);
    if (depth > MAX_CAPTURE_DEPTH || context.elements >= context.maxElements) {
      context.truncated = true;
      return [];
    }
    context.elements++;
    const node = {
      type: "element",
      tagName,
      attrs: attributesOf(element, context.view),
      computedStyle: readStyle(style),
      box: boxOf(element, context.origin),
      children: []
    };
    if (!captureReplaced(element, node, context)) {
      node.children = captureChildren(element, context, depth);
    }
    if (hasDirectText(element) || node.children.some((child) => child.type === "text")) {
      context.fonts.add(style);
    }
    captureBackground(style, node, context);
    return [node];
  }

  // src/capturer/index.ts
  var NO_IMAGES = {
    inline: async () => null,
    rasterizeSVG: async () => null,
    accept: () => null
  };
  function windowOf(document2) {
    const view = document2.defaultView;
    if (!view)
      throw new TypeError("Capturing needs a document shown in a window");
    return view;
  }
  function createContext(view, origin, options) {
    return {
      view,
      origin,
      maxElements: options.maxElements ?? MAX_CAPTURE_ELEMENTS,
      elements: 0,
      truncated: false,
      images: options.inlineImages === false ? NO_IMAGES : createImageInliner(view, {
        fetchImage: options.fetchImage,
        maxImageBytes: options.maxImageBytes,
        maxTotalBytes: options.maxTotalImageBytes,
        signal: options.signal
      }),
      fonts: createFontCollector(),
      pending: []
    };
  }
  async function finish(context, root, scope, options) {
    await Promise.all(context.pending);
    options.signal?.throwIfAborted();
    const { view } = context;
    return normalizeWebCapture({
      format: WEB_CAPTURE_FORMAT,
      version: WEB_CAPTURE_VERSION,
      scope,
      source: { url: view.location.href || undefined, title: view.document.title || undefined },
      capturedAt: new Date().toISOString(),
      viewport: {
        width: view.innerWidth,
        height: view.innerHeight,
        devicePixelRatio: view.devicePixelRatio || 1
      },
      root,
      fonts: context.fonts.list(),
      truncated: context.truncated
    });
  }
  function rootElement(element, context) {
    const nodes = walkElement(element, context);
    const first = nodes.at(0);
    if (nodes.length === 1 && first?.type === "element")
      return first;
    if (nodes.length === 0)
      throw new Error("The element is not displayed");
    const rect = element.getBoundingClientRect();
    return {
      type: "element",
      tagName: "div",
      attrs: {},
      computedStyle: { display: "block" },
      box: { x: 0, y: 0, width: rect.width, height: rect.height },
      children: nodes
    };
  }
  async function captureElement(element, options = {}) {
    options.signal?.throwIfAborted();
    const view = windowOf(element.ownerDocument);
    const rect = element.getBoundingClientRect();
    const context = createContext(view, { x: rect.left, y: rect.top }, options);
    return finish(context, rootElement(element, context), "element", options);
  }
  function isTransparent(color) {
    return color === "" || color === "transparent" || color === "rgba(0, 0, 0, 0)";
  }
  async function capturePage(document2 = globalThis.document, options = {}) {
    options.signal?.throwIfAborted();
    const view = windowOf(document2);
    const { body, documentElement } = document2;
    const pageRect = documentElement.getBoundingClientRect();
    const context = createContext(view, { x: pageRect.left, y: pageRect.top }, options);
    const root = rootElement(body, context);
    const bodyStyle = view.getComputedStyle(body);
    const style = root.computedStyle;
    for (const side of ["top", "right", "bottom", "left"]) {
      const margin = Number.parseFloat(bodyStyle.getPropertyValue(`margin-${side}`)) || 0;
      const padding = Number.parseFloat(bodyStyle.getPropertyValue(`padding-${side}`)) || 0;
      if (margin + padding > 0)
        style[`padding-${side}`] = `${margin + padding}px`;
      delete style[`margin-${side}`];
    }
    const background = [bodyStyle, view.getComputedStyle(documentElement)].map((computed) => computed.getPropertyValue("background-color")).find((color) => !isTransparent(color));
    style["background-color"] = background ?? "rgb(255, 255, 255)";
    const width = documentElement.clientWidth || pageRect.width;
    const height = Math.max(documentElement.scrollHeight, view.innerHeight);
    style.width = `${width}px`;
    style.height = `${height}px`;
    style["box-sizing"] = "border-box";
    root.box = { x: 0, y: 0, width, height };
    return finish(context, root, "page", options);
  }

  // src/capturer/page.ts
  var CAPTURE_OPTIONS = { inlineImages: false };
  async function capturePageHTML(document2 = globalThis.document) {
    return encodeWebCaptureClipboard(await capturePage(document2, CAPTURE_OPTIONS)).html;
  }
  async function captureElementHTML(element, document2 = globalThis.document) {
    if (!element || element.ownerDocument !== document2)
      return "";
    return encodeWebCaptureClipboard(await captureElement(element, CAPTURE_OPTIONS)).html;
  }
  function captureFailure(error) {
    const message = error instanceof Error ? error.message : String(error);
    return `pairdraw-capture-error:${message}`;
  }
  var pageWindow = globalThis;
  pageWindow.__pairdrawCapturePage = async () => {
    try {
      return await capturePageHTML(document);
    } catch (error) {
      return captureFailure(error);
    }
  };
  pageWindow.__pairdrawCaptureElement = async (selector) => {
    try {
      return await captureElementHTML(document.querySelector(selector), document);
    } catch (error) {
      return captureFailure(error);
    }
  };
})();
