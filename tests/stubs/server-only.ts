/**
 * `server-only` paketi Node'da import edilince kasten hata fırlatır; sadece
 * Next'in "react-server" koşullu export'unda boş modüle çözülür. Vitest düz
 * Node'da koştuğu için core/* → db/* zincirindeki `import "server-only"`
 * satırları test suite'ini yüklenmeden düşürüyordu. Bu boş modül alias ile
 * onun yerine geçer (bkz. vitest.config.mts → resolve.alias).
 */
export {};
