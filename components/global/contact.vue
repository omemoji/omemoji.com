<template>
  <a id="email" href=" ">Email</a>
</template>
<script>
export default {
  mounted() {
    const email = document.querySelector("#email");
    function decode(a) {
      return a.replace(/[a-zA-Z]/g, function (c) {
        return String.fromCharCode(
          (c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
        );
      });
    }
    function openMailer(element) {
      var y = decode("znvygb:zr@bzrzbwv.pbz");
      element.setAttribute("href", y);
      element.setAttribute("onclick", "");
    }
    function exe() {
      openMailer(email);
      setInterval(() => {
        email.setAttribute("href", " ");
      }, 0);
    }
    email.addEventListener("click", exe);
  },
};
</script>
