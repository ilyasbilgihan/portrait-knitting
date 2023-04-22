const rangers = [...document.querySelectorAll(".before-after input")];

rangers.forEach((range, index) => {
  range.addEventListener("input", function (event) {
    let value = event.target.value;

    document.querySelectorAll(".before-after .before")[index].style.width =
      value + "%";
  });
});
