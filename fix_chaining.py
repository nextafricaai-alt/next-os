with open("web/os-childcare.jsx", "r") as f:
    data = f.read()

data = data.replace("return centersData.find(c => c.id === selectedCenterId)?.children || [];", "const center = centersData.find(c => c.id === selectedCenterId); return center ? center.children : [];")
data = data.replace("return centersData.find(c => c.id === selectedCenterId)?.schedule || [];", "const center = centersData.find(c => c.id === selectedCenterId); return center ? center.schedule : [];")
data = data.replace("return centersData.find(c => c.id === selectedCenterId)?.messages || [];", "const center = centersData.find(c => c.id === selectedCenterId); return center ? center.messages : [];")
data = data.replace("return centersData.find(c => c.id === selectedCenterId)?.cameras || [];", "const center = centersData.find(c => c.id === selectedCenterId); return center ? center.cameras : [];")

with open("web/os-childcare.jsx", "w") as f:
    f.write(data)

print("SUCCESS")
