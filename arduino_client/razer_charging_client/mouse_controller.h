#include "mouse.h"

class Mouse_controller
{
public:
  Mouse_controller();

  void calculate_cycles_needed();
  void loop();
  void setMux(int);

private:
  int cycles_needed = 0;
  int current_cycle = 0;
  Mouse *mouse;
  bool computer_state = 1;
  bool charger_state = 1;
  unsigned long last_change_time = 0;
};