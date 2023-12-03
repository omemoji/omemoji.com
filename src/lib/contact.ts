const email: any = document.querySelector("#email");

function decode(a: any) {
  return a.replace(/[a-zA-Z]/g, function (c: any) {
    return String.fromCharCode(
      (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
    );
  });
}
function openMailer(element: any) {
  var y = decode("znvygb:zr@bzrzbwv.pbz");
  element.setAttribute("href", y);
  element.setAttribute("onclick", "");
}
function exe() {
  openMailer(email);
  setInterval(() => {
    email.setAttribute("href", "/");
  }, 0);
}
email.addEventListener("click", exe);
